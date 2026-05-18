-- ============================================================
-- MANUAL MIGRATION: Run in Supabase SQL Editor
-- Flexible Pricing Model — boutique_dresses + currencies
-- ============================================================

-- Step 1: Create currencies table
CREATE TABLE IF NOT EXISTS currencies (
  id     serial PRIMARY KEY,
  code   text NOT NULL,    -- e.g. 'VND', 'USD'
  name   text NOT NULL,    -- e.g. 'Vietnamese Dong'
  symbol text NOT NULL     -- e.g. '₫', '$'
);

INSERT INTO currencies (code, name, symbol)
VALUES ('VND', 'Vietnamese Dong', '₫')
ON CONFLICT DO NOTHING;

-- Step 2: Alter boutique_dresses
ALTER TABLE boutique_dresses
  ALTER COLUMN price DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_range    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS range_pct   integer,
  ADD COLUMN IF NOT EXISTS rent_price  numeric,
  ADD COLUMN IF NOT EXISTS currency_id integer REFERENCES currencies(id);
