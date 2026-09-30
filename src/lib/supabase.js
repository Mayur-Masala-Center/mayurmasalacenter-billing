import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
// Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/*
==========================================
SUPABASE SQL SCHEMA — run this in your Supabase SQL Editor
==========================================

-- Items table (item names only — price is entered per bill)
create table items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);
create unique index items_name_unique on items (lower(name));

-- Bills table
create table bills (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  total_amount numeric(10,2) default 0,
  status text default 'draft' check (status in ('draft', 'final', 'cancelled')),
  created_at timestamptz default now()
  -- (app also uses: created_by, billing_date, discount_percent, discount_amount,
  --  cancel_reason, cancelled_at, and bill_no — a sequential number given when a bill is printed;
  --  see supabase/migrations_part2_features.sql for the trigger that assigns it)
);

-- Bill items table (line items in a bill)
create table bill_items (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references bills(id) on delete cascade,
  item_id uuid references items(id),
  item_name text not null,
  item_price numeric(10,2) not null,
  quantity integer default 1,
  created_at timestamptz default now()
);

-- Enable realtime on bills (for dashboard live updates)
alter publication supabase_realtime add table bills;

-- RLS policies: require Supabase Auth (all tables locked to signed-in users)
alter table items enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;

-- Items: any authenticated user can read, insert, delete
create policy "Auth read items"   on items for select using (auth.role() = 'authenticated');
create policy "Auth insert items" on items for insert with check (auth.role() = 'authenticated');
create policy "Auth delete items" on items for delete using (auth.role() = 'authenticated');
create policy "Auth update items" on items for update using (auth.role() = 'authenticated');

-- Bills: any authenticated user can read, insert, update
create policy "Auth read bills"   on bills for select using (auth.role() = 'authenticated');
create policy "Auth insert bills" on bills for insert with check (auth.role() = 'authenticated');
create policy "Auth update bills" on bills for update using (auth.role() = 'authenticated');
-- Only DRAFTS can ever be deleted
create policy "Auth delete draft bills" on bills for delete using (auth.role() = 'authenticated' and status = 'draft');

-- Bill items: any authenticated user can read, insert and delete (drafts are re-saved)
create policy "Auth read bill_items"   on bill_items for select using (auth.role() = 'authenticated');
create policy "Auth insert bill_items" on bill_items for insert with check (auth.role() = 'authenticated');
create policy "Auth delete bill_items" on bill_items for delete using (auth.role() = 'authenticated');

==========================================
*/
