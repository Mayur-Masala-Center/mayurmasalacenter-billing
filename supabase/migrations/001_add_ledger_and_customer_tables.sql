-- ==============================================================================
-- ADDITIVE MIGRATION: 001_add_ledger_and_customer_tables.sql
-- Adds customers, udhari_ledger, and sales_ledger (Expense Tracker integration)
-- Safe & Backward-Compatible: Adds nullable columns to bills, creates new tables.
-- ==============================================================================

-- 1. Add customer_id and payment_mode to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'cash';

-- 2. Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid,
    name text NOT NULL,
    phone text,
    balance numeric(10,2) DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    device_id text,
    sync_status text DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(lower(name));

-- 3. Create udhari_ledger table (for credit sales, collections, and reversals)
CREATE TABLE IF NOT EXISTS udhari_ledger (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid,
    customer_id uuid REFERENCES customers(id),
    bill_id uuid REFERENCES bills(id),
    entry_type text NOT NULL CHECK (entry_type IN ('credit_sale', 'collection', 'reversal')),
    amount numeric(10,2) NOT NULL,
    balance_after numeric(10,2) NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    device_id text,
    sync_status text DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_udhari_customer_id ON udhari_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_udhari_updated_at ON udhari_ledger(updated_at);

-- 4. Create sales_ledger table (feeds Expense Tracker)
CREATE TABLE IF NOT EXISTS sales_ledger (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid,
    source_type text NOT NULL DEFAULT 'bill',
    source_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    sale_date date NOT NULL,
    payment_mode text NOT NULL DEFAULT 'cash',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    device_id text,
    sync_status text DEFAULT 'synced',
    CONSTRAINT uq_sales_ledger_source UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_ledger_date ON sales_ledger(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_updated_at ON sales_ledger(updated_at);

-- 5. RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE udhari_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read customers" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert customers" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update customers" ON customers FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth read udhari_ledger" ON udhari_ledger FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert udhari_ledger" ON udhari_ledger FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update udhari_ledger" ON udhari_ledger FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth read sales_ledger" ON sales_ledger FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert sales_ledger" ON sales_ledger FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update sales_ledger" ON sales_ledger FOR UPDATE USING (auth.role() = 'authenticated');

/*
-- ==============================================================================
-- ROLLBACK SCRIPT (To revert this migration if needed)
-- ==============================================================================
DROP TABLE IF EXISTS sales_ledger CASCADE;
DROP TABLE IF EXISTS udhari_ledger CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
ALTER TABLE bills DROP COLUMN IF EXISTS payment_mode;
ALTER TABLE bills DROP COLUMN IF EXISTS customer_id;
*/
