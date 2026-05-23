-- 012: reglas table — automation rule engine
-- Each rule has WHEN conditions (jsonb array) and THEN action (jsonb object)

CREATE TABLE IF NOT EXISTS public.reglas (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text        NOT NULL,
  descripcion       text,
  activa            boolean     NOT NULL DEFAULT true,
  condiciones       jsonb       NOT NULL DEFAULT '[]',
  accion            jsonb       NOT NULL DEFAULT '{}',
  veces_ejecutada   integer     NOT NULL DEFAULT 0,
  ultima_ejecucion  timestamptz,
  creado_por        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reglas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_reglas" ON public.reglas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
