-- 008_user_roles.sql
-- Mueve RBAC de env vars (OWNER_EMAILS / FINANCE_EMAILS, substring match) a tabla
-- persistente con RLS. La app puede leer el rol desde aquí con fallback al env si
-- la fila no existe (compatibilidad durante migración).

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('owner', 'finance', 'warehouse', 'agent')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles (lower(email));

-- RLS: cada user puede leer su propia fila; solo owner puede modificar.
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_own       ON user_roles;
DROP POLICY IF EXISTS user_roles_service_full     ON user_roles;
DROP POLICY IF EXISTS user_roles_owner_manage     ON user_roles;

-- Service role (agentes / backend) tiene acceso total.
CREATE POLICY user_roles_service_full
  ON user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users autenticados leen solo su propia fila.
CREATE POLICY user_roles_select_own
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Owners pueden gestionar todas las filas.
CREATE POLICY user_roles_owner_manage
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'owner'
    )
  );

-- Trigger updated_at automático.
CREATE OR REPLACE FUNCTION touch_user_roles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_updated_at ON user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION touch_user_roles_updated_at();

-- Seed: poblar tabla con auth.users existentes usando OWNER_EMAILS/FINANCE_EMAILS
-- como pista inicial. Los emails reales se inyectan via Vercel env vars; el seed
-- aquí es idempotente y deja a la app resolver vía fallback si la fila falta.
-- NOTA: este seed sólo corre si la tabla está vacía.
DO $$
DECLARE
  count_existing int;
BEGIN
  SELECT COUNT(*) INTO count_existing FROM user_roles;
  IF count_existing > 0 THEN
    RETURN;
  END IF;

  -- Si hay usuarios pre-existentes en auth.users, márcalos como warehouse por defecto.
  -- Los owners/finance se asignan vía UI o script post-deploy.
  INSERT INTO user_roles (user_id, email, role)
  SELECT id, COALESCE(email, ''), 'warehouse'
  FROM auth.users
  WHERE email IS NOT NULL
  ON CONFLICT (user_id) DO NOTHING;
END $$;
