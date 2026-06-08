-- Pre-setup for Supabase Cloud hosting.
-- On Supabase Cloud, uuid-ossp is installed in the 'extensions' schema
-- and may not be in the search path when migrations run.
-- This creates a public alias using gen_random_uuid() (PG 13+ native)
-- so uuid_generate_v4() calls in 001_initial_schema.sql resolve correctly.

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
AS $$ SELECT gen_random_uuid() $$;
