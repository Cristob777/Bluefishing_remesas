-- 005_performance_indexes.sql
-- Performance indexes identified by Database Optimizer audit
-- Reduces sidebar load ~75-80% by enabling index scans on hot filter columns

-- Remesas: most-queried table (9 queries per sidebar load)
CREATE INDEX IF NOT EXISTS idx_remesas_estado_created
  ON remesas(estado, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remesas_estado_despacho
  ON remesas(estado, numero_despacho)
  WHERE numero_despacho IS NULL;

-- Pagos: queried on every pending load
CREATE INDEX IF NOT EXISTS idx_pagos_remesa_id
  ON pagos(remesa_id);

CREATE INDEX IF NOT EXISTS idx_pagos_estado_created
  ON pagos(estado, created_at DESC);

-- Stock
CREATE INDEX IF NOT EXISTS idx_stock_recepciones_estado
  ON stock_recepciones(estado);

CREATE INDEX IF NOT EXISTS idx_stock_recepciones_remesa_estado
  ON stock_recepciones(remesa_id, estado);

CREATE INDEX IF NOT EXISTS idx_stock_items_recepcion
  ON stock_items(recepcion_id);

-- Agent logs: queried per remesa in side panel
CREATE INDEX IF NOT EXISTS idx_agent_logs_remesa_agent
  ON agent_logs(remesa_id, agent_name);

CREATE INDEX IF NOT EXISTS idx_agent_logs_remesa_resultado
  ON agent_logs(remesa_id, resultado);

CREATE INDEX IF NOT EXISTS idx_agent_logs_created
  ON agent_logs(created_at DESC);

-- Alertas
CREATE INDEX IF NOT EXISTS idx_alertas_remesa_leida
  ON alertas(remesa_id, leida);

CREATE INDEX IF NOT EXISTS idx_alertas_urgente_leida
  ON alertas(urgente, leida)
  WHERE NOT leida;

-- Provisiones
CREATE INDEX IF NOT EXISTS idx_provisiones_remesa_estado
  ON provisiones_fondos(remesa_id, estado);

CREATE INDEX IF NOT EXISTS idx_provisiones_estado_created
  ON provisiones_fondos(estado, created_at DESC);

-- Documentos: used in archivar_expediente check
CREATE INDEX IF NOT EXISTS idx_documentos_remesa_numero
  ON documentos(remesa_id, numero)
  WHERE numero LIKE 'CIERRE-%';
