-- Reemplaza run_sql con versión hardened.
-- Bloquea DDL y operaciones destructivas que los agentes no necesitan.
CREATE OR REPLACE FUNCTION run_sql(sql_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  result     jsonb;
BEGIN
  normalized := upper(regexp_replace(sql_text, '\s+', ' ', 'g'));

  -- Bloquear DDL y operaciones destructivas
  IF normalized ~ '^\s*(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|VACUUM|CLUSTER|REINDEX)' THEN
    RETURN jsonb_build_object(
      'error', 'Operación DDL no permitida para agentes',
      'blocked', true
    );
  END IF;

  -- Bloquear funciones de sistema peligrosas
  IF normalized ~ '(PG_READ_FILE|PG_WRITE_FILE|PG_EXECUTE|COPY\s+(FROM|TO)|DBLINK|LO_IMPORT|LO_EXPORT)' THEN
    RETURN jsonb_build_object(
      'error', 'Función de sistema no permitida',
      'blocked', true
    );
  END IF;

  -- Bloquear DELETE sin WHERE (borraria toda la tabla)
  IF normalized ~ '^\s*DELETE\s+FROM\s+\w+\s*;?\s*$' THEN
    RETURN jsonb_build_object(
      'error', 'DELETE sin cláusula WHERE no está permitido',
      'blocked', true
    );
  END IF;

  -- Bloquear UPDATE sin WHERE
  IF normalized ~ '^\s*UPDATE\s+\w+\s+SET\s+.+' AND normalized !~ '\sWHERE\s' THEN
    RETURN jsonb_build_object(
      'error', 'UPDATE sin cláusula WHERE no está permitido',
      'blocked', true
    );
  END IF;

  -- Ejecutar y devolver como JSON array
  EXECUTE format(
    'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (%s) t',
    sql_text
  ) INTO result;

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION run_sql TO service_role;
REVOKE EXECUTE ON FUNCTION run_sql FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION run_sql FROM anon;
REVOKE EXECUTE ON FUNCTION run_sql FROM authenticated;

-- Tabla de intentos de webhook para rate limiting persistente
CREATE TABLE IF NOT EXISTS webhook_rate_limits (
  ip          text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT NOW(),
  call_count  integer NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);

-- Limpia registros viejos automáticamente
CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON webhook_rate_limits (window_start);
