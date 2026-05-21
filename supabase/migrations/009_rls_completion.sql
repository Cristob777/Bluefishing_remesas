-- 009_rls_completion.sql
-- Habilita Row Level Security en todas las tablas core. Toda la lógica de negocio
-- corre con service_role (bypassea RLS automáticamente). Esto cierra el riesgo
-- de que la anon/publishable key (que viaja al browser) lea datos en frío.
--
-- Política base:
--   • service_role  → acceso completo (bypass implícito de RLS).
--   • authenticated → SELECT en tablas que el dashboard consume; sin INSERT/UPDATE/DELETE
--                     (las mutaciones pasan por API routes que usan service_role).
--   • anon          → sin policy = denegado.
--
-- Sin RLS la anon key permitiría leer la base completa.

-- Helper macro: una policy "select para authenticated" idempotente por tabla.
DO $$
DECLARE
  t text;
  read_tables text[] := ARRAY[
    'proveedores',
    'remesas',
    'pagos',
    'provisiones_fondos',
    'stock_recepciones',
    'stock_items',
    'documentos',
    'alertas',
    'agent_logs',
    'fx_rates',
    'obsidian_knowledge'
  ];
  internal_tables text[] := ARRAY[
    'webhook_rate_limits'
  ];
  pol record;
BEGIN
  -- Habilitar RLS en tablas leídas por el dashboard.
  FOREACH t IN ARRAY read_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Drop policies viejas con mismo nombre (idempotente).
    EXECUTE format('DROP POLICY IF EXISTS %I_authenticated_read ON %I', t, t);
    -- Authenticated puede leer (dashboard); mutaciones van por API + service_role.
    EXECUTE format($pol$
      CREATE POLICY %I_authenticated_read
        ON %I
        FOR SELECT
        TO authenticated
        USING (true)
    $pol$, t, t);
  END LOOP;

  -- Tablas internas (solo service_role).
  FOREACH t IN ARRAY internal_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Sin policies = solo service_role (bypass) puede acceder.
  END LOOP;
END $$;

-- Notas:
--   • La tabla user_roles ya tiene RLS desde 008_user_roles.sql.
--   • Si en el futuro se agregan tablas multi-tenant, deben heredar
--     este patrón o filtrar por auth.uid() en la policy.
