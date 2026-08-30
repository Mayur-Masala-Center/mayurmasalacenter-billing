# 🌶️ Mayur Masala — Billing System

A fast, mobile-friendly billing app with barcode scanning and Supabase Auth login.

## Features

- 🔐 **Login / Sign Up / Forgot Password** via Supabase Auth
- ✅ **Create items** with auto-generated CODE128 barcodes
- 🖨️ **Print barcode labels** to stick on products
- 📷 **Scan via mobile camera** — Next / Retake / Done flow
- 🧾 **Bill overview** — adjust quantities before submission
- 💰 **Billing dashboard** — mark payments received, realtime updates
- 📊 Stats for pending and collected amounts

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
  price numeric(10,2) not null,
  barcode text unique not null,
  created_at timestamptz default now()
);

-- Bills table
create table bills (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  total_amount numeric(10,2) default 0,
  status text default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz default now(),
  paid_at timestamptz
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
```

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
| 1 | Manager | Add items in **Items** page |
| 2 | Manager | Print labels → stick on products |
| 3 | Staff/Customer | Click **📷 Scan** → enter customer name |
| 4 | Staff/Customer | Point camera at each product → **Next** to add, **Retake** to redo |
| 5 | Staff/Customer | **Done** → review overview, adjust qty → **Submit Bill** |
| 6 | Biller | **Dashboard** → click bill → **💰 Mark as Paid** |

---

## Tech Stack

- **React + Vite** — SPA
- **Supabase** — PostgreSQL + Auth + Realtime
- **JsBarcode** — CODE128 barcode generation
- **ZXing** — camera barcode scanning
- **React Router v6** — routing + auth guards

---

## Notes

- Camera scanning **requires HTTPS** — works on Vercel, GitHub Pages, and `localhost`
- Grant camera permission when prompted on mobile
- Barcodes use CODE128 — also works with handheld USB barcode scanners
