-- ============================================================
-- BLUEFISHING.CL — Obsidian Knowledge Base (RAG Schema)
-- ============================================================

-- Tabla para almacenar el contenido textual de cada nota de Obsidian
create table obsidian_knowledge (
  id uuid primary key default uuid_generate_v4(),
  title text not null,              -- Título de la nota (por lo general el nombre del archivo sin .md)
  file_path text not null unique,   -- Ruta relativa del archivo en la bóveda, único para upserts
  content text not null,            -- El contenido markdown extraído del archivo
  last_modified timestamptz not null, -- Fecha de modificación original del archivo .md
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table obsidian_knowledge enable row level security;

-- Los agentes y el Sync Script acceden vía service_role, por ende todos los permisos aplican.
create policy "service_all_obsidian" 
  on obsidian_knowledge 
  for all 
  using (true);

-- Indexar por el título (nombre de la nota) será lo más común en búsquedas de los agentes
create index on obsidian_knowledge(title);

-- Trigger para updated_at
create trigger obsidian_knowledge_updated_at
  before update on obsidian_knowledge
  for each row execute function update_updated_at();
