-- =========================================================================
-- Bluefishing AI Agents — Security Migrations 007 + 008 + 009 (combined)
-- =========================================================================
-- Idempotent merge of migrations 007, 008, 009.
-- Use this if you want to apply all three in one shot from the SQL Editor
-- of Supabase Studio. The individual files (007/008/009) remain the source
-- of truth for version-controlled history.

-- =========================================================================
-- 007 · run_sql hardening (closes LLM-driven SQL injection)
-- =========================================================================
CREATE OR REPLACE FUNCTION run_sql(sql_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  normalized text;
  first_word text;
  result     jsonb;
BEGIN
  PERFORM set_config('statement_timeout', '5000', true);
  normalized := upper(regexp_replace(coalesce(sql_text, ''), '\s+', ' ', 'g'));
  normalized := trim(normalized);

  IF length(normalized) = 0 THEN
    RETURN jsonb_build_object('error', 'Empty SQL', 'blocked', true);
  END IF;
  IF normalized ~ '(--|/\*|\*/)' THEN
    RETURN jsonb_build_object('error', 'SQL comments not allowed', 'blocked', true);
  END IF;
  IF (length(normalized) - length(replace(rtrim(normalized, ' ;'), ';', ''))) > 0 THEN
    RETURN jsonb_build_object('error', 'Multi-statement SQL not allowed', 'blocked', true);
  END IF;

  first_word := split_part(normalized, ' ', 1);
  IF first_word NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH') THEN
    RETURN jsonb_build_object('error', 'Only SELECT/INSERT/UPDATE/DELETE/WITH allowed', 'blocked', true, 'verb', first_word);
  END IF;

  IF normalized ~ '\m(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|VACUUM|CLUSTER|REINDEX|COPY|DBLINK)\M' THEN
    RETURN jsonb_build_object('error', 'DDL/destructive operation not allowed', 'blocked', true);
  END IF;
  IF normalized ~ '(PG_READ_FILE|PG_WRITE_FILE|PG_EXECUTE|LO_IMPORT|LO_EXPORT)' THEN
    RETURN jsonb_build_object('error', 'System function not allowed', 'blocked', true);
  END IF;
  IF normalized ~ '\m(PG_CATALOG|INFORMATION_SCHEMA|PG_USER|PG_ROLES|PG_SHADOW|PG_AUTHID)\M' THEN
    RETURN jsonb_build_object('error', 'System catalog access not allowed', 'blocked', true);
  END IF;
  IF normalized ~ '^DELETE FROM \w+\s*;?\s*$' THEN
    RETURN jsonb_build_object('error', 'DELETE without WHERE not allowed', 'blocked', true);
  END IF;
  IF normalized ~ '^UPDATE \w+ SET ' AND normalized !~ '\sWHERE\s' THEN
    RETURN jsonb_build_object('error', 'UPDATE without WHERE not allowed', 'blocked', true);
  END IF;

  EXECUTE format('SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (%s) t', sql_text) INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'run_sql failed: % (state=%)', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object('error', 'Query failed', 'blocked', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION run_sql FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION run_sql FROM anon;
REVOKE EXECUTE ON FUNCTION run_sql FROM authenticated;
GRANT  EXECUTE ON FUNCTION run_sql TO service_role;


-- =========================================================================
-- 008 · user_roles table (RBAC from DB, no longer env substring match)
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('owner', 'finance', 'warehouse', 'agent')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles (lower(email));

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_own   ON user_roles;
DROP POLICY IF EXISTS user_roles_service_full ON user_roles;
DROP POLICY IF EXISTS user_roles_owner_manage ON user_roles;

CREATE POLICY user_roles_service_full ON user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY user_roles_select_own ON user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY user_roles_owner_manage ON user_roles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'owner'));

CREATE OR REPLACE FUNCTION touch_user_roles_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS user_roles_updated_at ON user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION touch_user_roles_updated_at();

DO $$
DECLARE count_existing int;
BEGIN
  SELECT COUNT(*) INTO count_existing FROM user_roles;
  IF count_existing > 0 THEN RETURN; END IF;
  INSERT INTO user_roles (user_id, email, role)
  SELECT id, COALESCE(email, ''), 'warehouse'
  FROM auth.users
  WHERE email IS NOT NULL
  ON CONFLICT (user_id) DO NOTHING;
END $$;


-- =========================================================================
-- 009 · RLS completion (defensive: skips tables that do not exist)
-- =========================================================================
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'proveedores','remesas','pagos','provisiones_fondos',
    'stock_recepciones','stock_items','documentos','alertas',
    'agent_logs','fx_rates','obsidian_knowledge','webhook_rate_limits'
  ];
  read_tables text[] := ARRAY[
    'proveedores','remesas','pagos','provisiones_fondos',
    'stock_recepciones','stock_items','documentos','alertas',
    'agent_logs','fx_rates','obsidian_knowledge'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'RLS enabled on %', t;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', t;
    END IF;
  END LOOP;

  FOREACH t IN ARRAY read_tables LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I_authenticated_read ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %I_authenticated_read ON %I FOR SELECT TO authenticated USING (true)',
        t, t
      );
      RAISE NOTICE 'SELECT policy created on %', t;
    END IF;
  END LOOP;
END $$;
