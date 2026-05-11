-- 006_nota_debito.sql
-- Agrega soporte para nota de débito AGENSA (saldo a favor por provisión > costo real)

-- Nuevo tipo de documento
ALTER TABLE documentos
  DROP CONSTRAINT IF EXISTS documentos_tipo_check;

-- Nuevo estado en remesas (sin constraint enum en Postgres, solo comentario)
COMMENT ON COLUMN remesas.estado IS
  'INVOICE_RECIBIDO → PAGO_PENDIENTE → PAGO_PARCIAL → PAGO_COMPLETO
   → EN_ADUANA → PROVISION_RECIBIDA → MERCADERIA_RECIBIDA
   → RECONCILIADO | SALDO_FAVOR → (cierre tras nota de débito)';

-- Campos en provisiones_fondos para registrar nota de débito
ALTER TABLE provisiones_fondos
  ADD COLUMN IF NOT EXISTS nota_debito_numero  text,
  ADD COLUMN IF NOT EXISTS monto_devolucion_clp numeric(15,0),
  ADD COLUMN IF NOT EXISTS nota_debito_fecha    date;

-- Nuevo tipo de alerta
COMMENT ON COLUMN alertas.tipo IS
  'PROVISION_URGENTE | PAGO_PENDIENTE | DIFERENCIA_STOCK | APROBACION_REQUERIDA | SALDO_FAVOR_AGENSA';

-- Index para buscar notas de débito pendientes
CREATE INDEX IF NOT EXISTS idx_remesas_saldo_favor
  ON remesas(estado, updated_at DESC)
  WHERE estado = 'SALDO_FAVOR';

CREATE INDEX IF NOT EXISTS idx_documentos_nota_debito
  ON documentos(remesa_id, tipo)
  WHERE tipo = 'NOTA_DEBITO';
