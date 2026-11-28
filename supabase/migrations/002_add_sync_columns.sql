-- Migration 002: Add columns required by the Android Offline Sync engine

-- 1. Items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE items ADD COLUMN IF NOT EXISTS device_id text DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced';
ALTER TABLE items ADD COLUMN IF NOT EXISTS shop_id uuid;
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);

-- 2. Bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS device_id text DEFAULT '';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS bill_no integer;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'cash';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS billing_date date;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS shop_id uuid;
CREATE INDEX IF NOT EXISTS idx_bills_updated_at ON bills(updated_at);

-- 3. Bill Items table
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS device_id text DEFAULT '';
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced';
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS shop_id uuid;
CREATE INDEX IF NOT EXISTS idx_bill_items_updated_at ON bill_items(updated_at);

-- 4. Store Settings table
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS device_id text DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS shop_id uuid;
CREATE INDEX IF NOT EXISTS idx_store_settings_updated_at ON store_settings(updated_at);

-- 5. Trigger to auto-update updated_at on modify
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_items_updated_at') THEN
    CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bills_updated_at') THEN
    CREATE TRIGGER trg_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bill_items_updated_at') THEN
    CREATE TRIGGER trg_bill_items_updated_at BEFORE UPDATE ON bill_items FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;
