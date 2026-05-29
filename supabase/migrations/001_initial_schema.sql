-- ============================================================
-- BLUEFISHING.CL — Initial Schema
-- MI TIENDA SPA · RUT 76.999.020-8
-- ============================================================

create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- PROVEEDORES
-- ────────────────────────────────────────────────────────────
create table proveedores (
  id              uuid primary key default uuid_generate_v4(),
  nombre          text not null,
  pais            text not null,
  moneda          text not null,   -- USD | JPY | CNH
  contacto_nombre text,
  contacto_email  text,
  created_at      timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- REMESAS  (una por invoice de proveedor)
-- ────────────────────────────────────────────────────────────
create table remesas (
  id               uuid primary key default uuid_generate_v4(),
  proveedor_id     uuid references proveedores(id),
  numero_invoice   text not null,
  estado           text not null default 'INVOICE_RECIBIDO',
  -- INVOICE_RECIBIDO → PAGO_PENDIENTE → PAGO_PARCIAL → PAGO_COMPLETO
  -- → EN_ADUANA → PROVISION_RECIBIDA → MERCADERIA_RECIBIDA → RECONCILIADO
  moneda_origen    text not null,   -- USD | JPY | CNH
  monto_original   numeric(15,4) not null,
  monto_total_usd  numeric(15,4),
  monto_total_jpy  numeric(15,0),
  condicion_pago   text,            -- '30/70' | '50/50' | '100%' | ...
  numero_despacho  text,
  din_numero       text,
  fecha_invoice    date,
  notas            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- PAGOS  (uno o más por remesa según condición)
-- ────────────────────────────────────────────────────────────
create table pagos (
  id                   uuid primary key default uuid_generate_v4(),
  remesa_id            uuid references remesas(id) not null,
  tipo                 text not null,   -- ANTICIPO | SALDO | UNICO
  monto_moneda_origen  numeric(15,4) not null,
  moneda               text not null,
  monto_clp            numeric(15,0),
  fx_rate              numeric(15,6),   -- FX en fecha de PAGO (regla crítica)
  fx_fecha             date,
  estado               text not null default 'PENDIENTE',  -- PENDIENTE | EMITIDO | CONFIRMADO
  orden_pago_numero    text,
  fecha_emision        date,
  fecha_confirmacion   date,
  created_by           text,            -- 'hector' | 'sebastian'
  created_at           timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- PROVISIONES DE FONDOS  (de AGENSA)
-- ────────────────────────────────────────────────────────────
create table provisiones_fondos (
  id               uuid primary key default uuid_generate_v4(),
  remesa_id        uuid references remesas(id),
  numero_despacho  text not null,
  monto_clp        numeric(15,0) not null,
  fecha_vencimiento date,
  es_urgente       boolean default false,   -- true si ≤ 3 días
  estado           text not null default 'PENDIENTE',  -- PENDIENTE | PAGADO
  email_id_origen  text,                    -- clave de dedup
  recibido_por     text[] default '{}',     -- ['sebastian','hector']
  created_at       timestamptz default now(),
  paid_at          timestamptz
);

-- ────────────────────────────────────────────────────────────
-- RECEPCIONES DE STOCK  (etapa IV)
-- ────────────────────────────────────────────────────────────
create table stock_recepciones (
  id               uuid primary key default uuid_generate_v4(),
  remesa_id        uuid references remesas(id) not null,
  fecha_recepcion  date not null,
  estado           text not null default 'PENDIENTE',
  -- PENDIENTE | CONTADO | INGRESADO_BSALE | CON_DIFERENCIAS
  ingresado_bsale_at timestamptz,
  created_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ITEMS DE STOCK  (por SKU)
-- ────────────────────────────────────────────────────────────
create table stock_items (
  id                  uuid primary key default uuid_generate_v4(),
  recepcion_id        uuid references stock_recepciones(id) not null,
  remesa_id           uuid references remesas(id) not null,
  sku                 text not null,
  descripcion         text,
  cantidad_invoice    integer not null,
  cantidad_recibida   integer,           -- lo que bodega contó
  diferencia          integer generated always as (cantidad_recibida - cantidad_invoice) stored,
  bsale_product_id    text,
  precio_unitario_usd numeric(10,4),
  created_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- DOCUMENTOS  (invoices, DINs, facturas AA, provisiones)
-- ────────────────────────────────────────────────────────────
create table documentos (
  id               uuid primary key default uuid_generate_v4(),
  remesa_id        uuid references remesas(id),
  tipo             text not null,   -- INVOICE | DIN | FACTURA_AGENSA | PROVISION | OTRO
  numero           text,
  archivo_nombre   text,
  archivo_url      text,            -- Supabase Storage URL
  monto            numeric(15,4),
  moneda           text,
  fecha            date,
  email_id_origen  text,
  created_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ALERTAS
-- ────────────────────────────────────────────────────────────
create table alertas (
  id           uuid primary key default uuid_generate_v4(),
  remesa_id    uuid references remesas(id),
  tipo         text not null,
  -- PROVISION_URGENTE | PAGO_PENDIENTE | DIFERENCIA_STOCK | APROBACION_REQUERIDA
  mensaje      text not null,
  urgente      boolean default false,
  leida        boolean default false,
  destinatario text,    -- 'sebastian' | 'hector' | 'ambos'
  created_at   timestamptz default now(),
  leida_at     timestamptz
);

-- ────────────────────────────────────────────────────────────
-- AGENT LOGS  (audit trail inmutable — nunca borrar)
-- ────────────────────────────────────────────────────────────
create table agent_logs (
  id            uuid primary key default uuid_generate_v4(),
  agent_name    text not null,
  session_id    text,
  remesa_id     uuid references remesas(id),
  accion        text not null,
  payload       jsonb,
  resultado     text,   -- SUCCESS | ERROR | PENDING_APPROVAL
  error_mensaje text,
  created_at    timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- FX RATES  (cache de CMF Chile)
-- ────────────────────────────────────────────────────────────
create table fx_rates (
  id        uuid primary key default uuid_generate_v4(),
  moneda    text not null,   -- USD | JPY | EUR | CNH
  fecha     date not null,
  tasa_clp  numeric(15,6) not null,
  fuente    text default 'CMF',
  created_at timestamptz default now(),
  unique(moneda, fecha)
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
alter table proveedores       enable row level security;
alter table remesas            enable row level security;
alter table pagos              enable row level security;
alter table provisiones_fondos enable row level security;
alter table stock_recepciones  enable row level security;
alter table stock_items        enable row level security;
alter table documentos         enable row level security;
alter table alertas            enable row level security;
alter table agent_logs         enable row level security;
alter table fx_rates           enable row level security;

-- Service role full access (agentes usan service_role key)
create policy "service_all" on proveedores       for all using (true);
create policy "service_all" on remesas            for all using (true);
create policy "service_all" on pagos              for all using (true);
create policy "service_all" on provisiones_fondos for all using (true);
create policy "service_all" on stock_recepciones  for all using (true);
create policy "service_all" on stock_items        for all using (true);
create policy "service_all" on documentos         for all using (true);
create policy "service_all" on alertas            for all using (true);
create policy "service_all" on agent_logs         for all using (true);
create policy "service_all" on fx_rates           for all using (true);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
create index on remesas(estado);
create index on remesas(proveedor_id);
create index on remesas(numero_invoice);
create index on remesas(numero_despacho);
create index on pagos(remesa_id);
create index on pagos(estado);
create index on provisiones_fondos(estado);
create index on provisiones_fondos(email_id_origen);
create index on provisiones_fondos(es_urgente, estado);
create index on alertas(leida, urgente);
create index on alertas(remesa_id);
create index on agent_logs(session_id);
create index on agent_logs(remesa_id);
create index on fx_rates(moneda, fecha);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: updated_at en remesas
-- ────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger remesas_updated_at
  before update on remesas
  for each row execute function update_updated_at();
