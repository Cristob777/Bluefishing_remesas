-- 010_gmail_accounts.sql
-- Almacena refresh tokens OAuth de Gmail en DB en vez de env vars.
-- Permite que usuarios conecten su Gmail desde el dashboard sin redeploy.
--
-- Tablas:
--   gmail_accounts — tokens por cuenta (upsert por account_label)
--   oauth_nonces   — nonces CSRF de corta vida para el flujo OAuth

CREATE TABLE IF NOT EXISTS gmail_accounts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_label text        NOT NULL UNIQUE,   -- 'sebastian', 'hector', 'ops', etc.
  email         text,                           -- dirección de correo (para display)
  refresh_token text        NOT NULL,
  connected_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_nonces (
  nonce      text        PRIMARY KEY,
  user_id    uuid        NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: solo service_role (API routes) accede. anon/authenticated = denegado.
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_nonces   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gmail_accounts_service ON gmail_accounts;
DROP POLICY IF EXISTS oauth_nonces_service   ON oauth_nonces;

CREATE POLICY gmail_accounts_service ON gmail_accounts FOR ALL TO service_role USING (true);
CREATE POLICY oauth_nonces_service   ON oauth_nonces   FOR ALL TO service_role USING (true);
