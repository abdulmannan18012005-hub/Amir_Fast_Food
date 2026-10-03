-- Idempotent setup for Supabase Realtime Publication
BEGIN;

-- Drop the publication if it exists to recreate it cleanly (or just add tables)
-- Actually, Supabase uses a specific publication named 'supabase_realtime'.
-- We can add tables to it idempotently.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add necessary tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;

-- Note: If a table is already in the publication, the above ALTER PUBLICATION might throw an error.
-- A safer idempotent way for PostgreSQL 11+:
-- ALTER PUBLICATION supabase_realtime SET TABLE orders, menu_items;
-- Let's use SET TABLE to overwrite with exactly the tables we need.

ALTER PUBLICATION supabase_realtime SET TABLE orders, menu_items;

COMMIT;
