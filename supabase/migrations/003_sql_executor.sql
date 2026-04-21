-- SQL executor for AI agents (service_role only)
-- Wraps arbitrary SQL in json_agg so agents always get rows back.
-- For DML: agents MUST include RETURNING clause.
CREATE OR REPLACE FUNCTION run_sql(sql_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
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
