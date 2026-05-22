-- 011_nota_credito_agensa.sql
-- Completa el flujo de saldo a favor AGENSA con nota de crédito/débito.

COMMENT ON COLUMN documentos.tipo IS
  'INVOICE | DIN | FACTURA_AGENSA | PROVISION | NOTA_DEBITO | NOTA_CREDITO | OTRO';

COMMENT ON COLUMN provisiones_fondos.nota_debito_numero IS
  'Número de nota AGENSA asociada al saldo a favor. Puede ser nota de débito o crédito según emisión de la agencia.';

COMMENT ON COLUMN provisiones_fondos.monto_devolucion_clp IS
  'Monto CLP devuelto, abonado, compensado o reconocido por AGENSA a favor de Bluefishing.';

COMMENT ON COLUMN provisiones_fondos.nota_debito_fecha IS
  'Fecha de emisión de la nota AGENSA asociada al saldo a favor.';

CREATE INDEX IF NOT EXISTS idx_documentos_nota_credito
  ON documentos(remesa_id, tipo)
  WHERE tipo = 'NOTA_CREDITO';
