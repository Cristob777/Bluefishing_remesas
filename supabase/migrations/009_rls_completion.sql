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
-- Defensivo: si una tabla del array no existe (por ej. webhook_rate_limits
-- antes de aplicar 004), se salta con NOTICE en vez de abortar.

DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
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
    'obsidian_knowledge',
    'webhook_rate_limits'
  ];
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
BEGIN
  -- Habilitar RLS en todas las tablas core (incluida la interna).
  FOREACH t IN ARRAY all_tables LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'RLS enabled on %', t;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', t;
    END IF;
  END LOOP;

  -- Policies de SELECT para authenticated (las mutaciones van por API + service_role).
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

-- Notas:
--   • user_roles ya tiene RLS desde 008_user_roles.sql.
--   • webhook_rate_limits (de 004) se incluye en all_tables pero se salta si
--     004 no se ha aplicado. Sin policies = solo service_role accede.
