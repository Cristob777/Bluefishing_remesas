-- 007_run_sql_hardening.sql
-- Endurece run_sql() para cerrar el vector de SQL injection vía LLM:
--   1. SECURITY INVOKER (en vez de DEFINER) — corre con privilegios del caller,
--      no del owner del schema. Solo service_role tiene EXECUTE.
--   2. Whitelist estricto de statements: SELECT / INSERT / UPDATE / DELETE.
--   3. Bloqueo de comentarios SQL (--, /* */) que podrían encadenar statements.
--   4. Bloqueo de acceso a pg_* / information_schema / catálogos internos.
--   5. statement_timeout local de 5s para evitar agentes en loop.
--   6. Errores genéricos al caller (no leak de SQLSTATE/SQLERRM al LLM).

CREATE OR REPLACE FUNCTION run_sql(sql_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  normalized   text;
  first_word   text;
  result       jsonb;
BEGIN
  -- Timeout local; agente queda colgado → 5s y se aborta.
  PERFORM set_config('statement_timeout', '5000', true);

  -- Normalizar: collapse whitespace, uppercase.
  normalized := upper(regexp_replace(coalesce(sql_text, ''), '\s+', ' ', 'g'));
  normalized := trim(normalized);

  IF length(normalized) = 0 THEN
    RETURN jsonb_build_object('error', 'Empty SQL', 'blocked', true);
  END IF;

  -- Bloquear comentarios SQL (-- ... y /* ... */) que permiten encadenar
  -- statements y burlar otras validaciones.
  IF normalized ~ '(--|/\*|\*/)' THEN
    RETURN jsonb_build_object('error', 'SQL comments not allowed', 'blocked', true);
  END IF;

  -- Bloquear punto y coma intermedio (multi-statement) — permitimos solo uno opcional al final.
  IF (length(normalized) - length(replace(rtrim(normalized, ' ;'), ';', ''))) > 0 THEN
    RETURN jsonb_build_object('error', 'Multi-statement SQL not allowed', 'blocked', true);
  END IF;

  -- Whitelist de verbo inicial.
  first_word := split_part(normalized, ' ', 1);
  IF first_word NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH') THEN
    RETURN jsonb_build_object(
      'error',   'Only SELECT/INSERT/UPDATE/DELETE/WITH allowed',
      'blocked', true,
      'verb',    first_word
    );
  END IF;

  -- Bloqueo defensivo de DDL/funciones de sistema (mantiene compat con 004).
  IF normalized ~ '\m(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|VACUUM|CLUSTER|REINDEX|COPY|DBLINK)\M' THEN
    RETURN jsonb_build_object('error', 'DDL/destructive operation not allowed', 'blocked', true);
  END IF;

  IF normalized ~ '(PG_READ_FILE|PG_WRITE_FILE|PG_EXECUTE|LO_IMPORT|LO_EXPORT)' THEN
    RETURN jsonb_build_object('error', 'System function not allowed', 'blocked', true);
  END IF;

  -- Bloquear acceso a catálogos internos / información de sistema.
  IF normalized ~ '\m(PG_CATALOG|INFORMATION_SCHEMA|PG_USER|PG_ROLES|PG_SHADOW|PG_AUTHID)\M' THEN
    RETURN jsonb_build_object('error', 'System catalog access not allowed', 'blocked', true);
  END IF;

  -- DELETE / UPDATE sin WHERE → bloqueado.
  IF normalized ~ '^DELETE FROM \w+\s*;?\s*$' THEN
    RETURN jsonb_build_object('error', 'DELETE without WHERE not allowed', 'blocked', true);
  END IF;

  IF normalized ~ '^UPDATE \w+ SET ' AND normalized !~ '\sWHERE\s' THEN
    RETURN jsonb_build_object('error', 'UPDATE without WHERE not allowed', 'blocked', true);
  END IF;

  -- Ejecutar y devolver como JSON array.
  EXECUTE format(
    'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (%s) t',
    sql_text
  ) INTO result;

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- No leak de SQLERRM/SQLSTATE al LLM — solo logging server-side.
  RAISE WARNING 'run_sql failed: % (state=%)', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object('error', 'Query failed', 'blocked', false);
END;
$$;

-- Lock down: solo service_role puede ejecutar.
REVOKE EXECUTE ON FUNCTION run_sql FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION run_sql FROM anon;
REVOKE EXECUTE ON FUNCTION run_sql FROM authenticated;
GRANT  EXECUTE ON FUNCTION run_sql TO service_role;
