-- 014: Fix overly permissive RLS on `reglas` table
--
-- Problem: migration 012 created a single FOR ALL policy that let ANY
-- authenticated user (including warehouse role) create, modify, or delete
-- automation rules. This poses a privilege escalation risk.
--
-- Fix:
--   - SELECT stays open to all authenticated users (read-only is safe).
--   - INSERT / UPDATE / DELETE restricted to owner and finance roles via user_roles.
--   - service_role retains full access (agents need to execute rules).

-- Drop the permissive catch-all policy
DROP POLICY IF EXISTS "auth_all_reglas" ON public.reglas;

-- 1. Service role — full access (agents and backend)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reglas'
      AND policyname = 'reglas_service_full'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY reglas_service_full
        ON public.reglas
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $pol$;
  END IF;
END$$;

-- 2. Authenticated users — SELECT only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reglas'
      AND policyname = 'reglas_authenticated_read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY reglas_authenticated_read
        ON public.reglas
        FOR SELECT
        TO authenticated
        USING (true)
    $pol$;
  END IF;
END$$;

-- 3. Owner and finance roles — write access (INSERT / UPDATE / DELETE)
--    Reads the role from user_roles table; falls back to false if no row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reglas'
      AND policyname = 'reglas_owner_finance_write'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY reglas_owner_finance_write
        ON public.reglas
        FOR ALL  -- covers INSERT, UPDATE, DELETE (WITH CHECK enforces on write)
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'finance')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'finance')
          )
        )
    $pol$;
  END IF;
END$$;
