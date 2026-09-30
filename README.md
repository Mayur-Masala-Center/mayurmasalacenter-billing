# 🌶️ Mayur Masala — Billing System

A fast, mobile-friendly manual billing app with Supabase Auth login.

## Features

- 🔐 **Login / Sign Up / Forgot Password** via Supabase Auth
- 📦 **Item catalog** — save item names once (rename or delete any time)
- ✏️ **Manual billing** — type or pick an item, enter price and qty; one-tap ✕ removes a line
- ⚡ **Faster billing** — the last price you used is filled in for you, most-billed items show as one-tap chips, recent customer names are suggested
- 🔁 **Repeat bill** — copy an earlier bill (customer + items) into a new one
- 💾 **Save Draft** / 🖨️ **Print Bill** — print saves the bill and sends it to the Bluetooth thermal printer in one tap
- 🔢 **Sequential bill numbers** (MM-000001 …) given when a bill is printed
- 📊 **Dashboard (owners only)** — Today / Yesterday / 7 days / 30 days / pick-a-date, search by customer or bill number, sales totals
- 🗑️ **Delete drafts** (one, or all older than 7 days) — printed bills can never be deleted
- 🚫 **Cancel a printed bill** with a reason (kept in records, left out of sales)
- ⬇️ **Export to Excel** — bills (with items) and item-wise sales for the period on screen
- 💬 **WhatsApp** the bill to the customer

---

## Setup

### 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) → create a free project
2. Open **SQL Editor** and run this schema:

```sql
-- Items table
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
  status text default 'draft' check (status in ('draft', 'final')),
  created_at timestamptz default now()
);

-- Bill items
create table bill_items (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references bills(id) on delete cascade,
  item_id uuid references items(id),
  item_name text not null,
  item_price numeric(10,2) not null,
  quantity integer default 1,
  created_at timestamptz default now()
);

-- Realtime for dashboard
alter publication supabase_realtime add table bills;

-- RLS: require authentication
alter table items enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;

create policy "Auth read items"   on items for select using (auth.role() = 'authenticated');
create policy "Auth insert items" on items for insert with check (auth.role() = 'authenticated');
create policy "Auth delete items" on items for delete using (auth.role() = 'authenticated');

create policy "Auth read bills"   on bills for select using (auth.role() = 'authenticated');
create policy "Auth insert bills" on bills for insert with check (auth.role() = 'authenticated');
create policy "Auth update bills" on bills for update using (auth.role() = 'authenticated');

create policy "Auth read bill_items"   on bill_items for select using (auth.role() = 'authenticated');
create policy "Auth insert bill_items" on bill_items for insert with check (auth.role() = 'authenticated');
create policy "Auth delete bill_items" on bill_items for delete using (auth.role() = 'authenticated');
```

> **Upgrading an existing database?** Run these in the Supabase SQL editor, in order, *before* deploying:
> 1. `supabase/migrations_manual_billing.sql` (names-only items, draft/printed statuses) — run it **once**; do not re-run after the app is live.
> 2. `supabase/migrations_part2_features.sql` (delete drafts, rename items, cancel bills, sequential bill numbers) — safe to re-run.

3. Go to **Authentication → Settings** — email auth is enabled by default
4. (Optional) Disable "Confirm email" for internal use: **Auth → Settings → Email → uncheck "Enable email confirmations"**
5. Go to **Settings → API** — copy **Project URL** and **anon public key**

### 2. Local Setup

```bash
unzip billing-app.zip && cd billing-app
cp .env.example .env
# Edit .env — paste your Supabase URL and anon key
npm install
npm run dev
```

### 3. Deploy to Vercel

```bash
npm install -g vercel
vercel
```
In Vercel dashboard → Settings → Environment Variables, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Deploy to GitHub Pages

```js
// vite.config.js — set base to your repo name:
base: '/your-repo-name/'
```
```bash
npm run build
# Push the dist/ folder using gh-pages or GitHub Actions
```

---

## Usage

### First Time
- Open the app → you'll see the **Mayur Masala Sign In** screen
- Click **Sign Up** → enter email + password → sign in
- (If email confirmation is on, check inbox first)

### Daily Flow

| Step | Who | Action |
|------|-----|--------|
| 1 | Anyone | **🧾 New Bill** → enter customer name (recent customers are suggested) and date |
| 2 | Anyone | Type or tap an item (price is pre-filled from last time), set qty → **+ Add to Bill**; ✕ removes a line |
| 3 | Anyone | Optionally set a discount %, then **🖨️ Print Bill** (saves and prints) or **💾 Save Draft** |
| 4 | Owner | **Dashboard** → find a bill by date/search; open a draft to edit/print/delete it; **🔁 Repeat** a regular customer's bill; **🚫 Cancel** a wrong printed bill; **⬇️ Export** for your accountant |

Printed bills are locked; they can be reprinted, repeated, cancelled or shared from the Dashboard.

------|-----|--------|
| 1 | Anyone | (Optional) add item names in **Items** |
| 2 | Anyone | **🧾 New Bill** → enter customer name and date |
| 3 | Anyone | Type or pick an item, enter price and qty → **+ Add to Bill** (repeat) |
| 4 | Anyone | Optionally set a discount %, then **🖨️ Print Bill** (saves and prints) or **💾 Save Draft** |
| 5 | Owner | **Dashboard → Drafts** → open a draft → **✏️ Edit Draft** → **🖨️ Print Bill** |

Printed bills are locked; they can be reprinted or shared from the Dashboard.

---

## Tech Stack

- **React + Vite** — SPA
- **Supabase** — PostgreSQL + Auth + Realtime
- **React Router v6** — routing + auth guards

---

## Notes

- Printing uses the **Bluetooth Print** Android app via a `my.bluetoothprint.scheme://` deep link (unchanged).
- Only owners (see `src/lib/roles.js`) can open the Dashboard.
