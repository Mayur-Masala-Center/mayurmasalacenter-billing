-- ============================================================
-- Complete Migration: Run this in Supabase SQL Editor
-- This adds all missing tables and columns needed by the Android app.
-- ============================================================

-- 1. Ensure Customers table exists
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    credit_balance NUMERIC(10,2) DEFAULT 0.0,
    shop_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    device_id TEXT DEFAULT '',
    sync_status TEXT DEFAULT 'synced'
);

-- 2. Ensure Udhari Ledger table exists
CREATE TABLE IF NOT EXISTS udhari_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    bill_id UUID,
    entry_type TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    balance_after NUMERIC(10,2) NOT NULL,
    notes TEXT,
    shop_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    device_id TEXT DEFAULT '',
    sync_status TEXT DEFAULT 'synced'
);

-- 3. Ensure Sales Ledger table exists
CREATE TABLE IF NOT EXISTS sales_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL DEFAULT 'bill',
    source_id TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    sale_date TEXT NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'cash',
    status TEXT NOT NULL DEFAULT 'active',
    shop_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    device_id TEXT DEFAULT '',
    sync_status TEXT DEFAULT 'synced'
);

-- 4. Ensure Store Settings table exists
CREATE TABLE IF NOT EXISTS store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    device_id TEXT DEFAULT '',
    sync_status TEXT DEFAULT 'synced',
    shop_id UUID
);

-- 5. Add columns to Items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE items ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE items ADD COLUMN IF NOT EXISTS shop_id UUID;
UPDATE items SET updated_at = created_at WHERE updated_at IS NULL;

-- 6. Add columns to Bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS bill_no INTEGER;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS billing_date DATE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS shop_id UUID;
UPDATE bills SET updated_at = created_at WHERE updated_at IS NULL;

-- 7. Add columns to Bill Items table
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS shop_id UUID;
UPDATE bill_items SET updated_at = created_at WHERE updated_at IS NULL;

-- 8. Add columns to Store Settings table if already existed
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS shop_id UUID;

-- 9. Performance indexes for sync queries
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
CREATE INDEX IF NOT EXISTS idx_bills_updated_at ON bills(updated_at);
CREATE INDEX IF NOT EXISTS idx_bill_items_updated_at ON bill_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at);
CREATE INDEX IF NOT EXISTS idx_udhari_updated_at ON udhari_ledger(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales_ledger(updated_at);
CREATE INDEX IF NOT EXISTS idx_store_settings_updated_at ON store_settings(updated_at);

-- 10. Enable Row Level Security (RLS) on all tables for authenticated users
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE udhari_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Customers policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Auth all customers') THEN
        CREATE POLICY "Auth all customers" ON customers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    END IF;
    -- Udhari policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'udhari_ledger' AND policyname = 'Auth all udhari') THEN
        CREATE POLICY "Auth all udhari" ON udhari_ledger FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    END IF;
    -- Sales policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_ledger' AND policyname = 'Auth all sales') THEN
        CREATE POLICY "Auth all sales" ON sales_ledger FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    END IF;
    -- Store settings policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_settings' AND policyname = 'Auth all store_settings') THEN
        CREATE POLICY "Auth all store_settings" ON store_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
