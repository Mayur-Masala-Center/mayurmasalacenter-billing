# Phase 0: Implementation Plan — Stellar Forge Billing (Native Android)

## 1. Chosen Toolkit & Code Reuse

**Chosen Toolkit:** **Kotlin + Jetpack Compose** (with Room, WorkManager, Hilt, and `supabase-kt` / Ktor).

### Why Kotlin + Jetpack Compose
- **Hard Constraint Compliance:** Produces a 100% native Android app (APK & AAB) with zero WebView, Capacitor, Cordova, or TWA.
- **Native Bluetooth Classic (SPP/RFCOMM):** Android's `BluetoothAdapter` and `BluetoothSocket` APIs are first-class in Kotlin, with clean coroutine/Flow support for off-main-thread thermal printing, reconnects, and Android 12+ (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`) runtime permissions.
- **Offline-First & Background Sync:** **Room** (SQLite) + **WorkManager** are Android's standard, battery-aware persistence and background sync primitives, surviving app kills and device reboots.
- **Hindi/Marathi/English Receipt Rendering:** Android's native `Canvas` + `TextPaint` renders Devanagari (Hindi/Marathi) shaping natively and converts it to a 1-bit monochrome ESC/POS raster bitmap for any thermal printer.

### Reused vs. Rewritten
| Area | Reused from Web App | Rewritten in Native Android |
|---|---|---|
| **Backend & Auth** | Same Supabase project, RLS policies, email/password auth, `OWNER_EMAILS` role check | `supabase-kt` client + `EncryptedSharedPreferences` session storage |
| **Business Logic** | Bill numbering (`MM-000123`), IST (`Asia/Kolkata`) date handling, `billTotals` round-off/discount math, `SHOP` details, UPI URI format | Ported to Kotlin (`BillUtils.kt`) with unit tests |
| **Receipt Layout** | 80mm (48-col) & 58mm (32-col) layout, logo, header, item table, totals, UPI QR, `Billing by Stellar Forge (www.stellarforgetech.in)` footer | Native ESC/POS byte builder + `Canvas` bitmap rasterizer |
| **UI Screens** | Same flows & fields: Login, Home, Items, New/Edit Bill, Dashboard, Bill Detail, Print Preview | Rebuilt in Jetpack Compose + Material 3 |
| **Printing** | Replaced `my.bluetoothprint.scheme://` (Thermer bridge) | Native Bluetooth Classic SPP/RFCOMM driver + Printer Setup screen |

---

## 2. Local Database Schema (Room / SQLite)

Every syncable table includes:
- `id: String` (client-generated UUID v4, Primary Key)
- `shop_id: String`
- `created_at: Long` (epoch ms UTC)
- `updated_at: Long` (epoch ms UTC)
- `deleted_at: Long?` (nullable, soft-delete only)
- `device_id: String`
- `sync_status: String` (`pending` | `synced` | `error`)

### Tables
1. **`shop_settings`** (`id`, `key`, `value_json`, `shop_id`, `created_at`, `updated_at`, `deleted_at`, `device_id`, `sync_status`)
2. **`items`** (`id`, `name`, `shop_id`, `created_at`, `updated_at`, `deleted_at`, `device_id`, `sync_status`)
3. **`customers`** (`id`, `name`, `phone`, `balance`, `shop_id`, `created_at`, `updated_at`, `deleted_at`, `device_id`, `sync_status`)
4. **`bills`** (`id`, `bill_no`, `device_bill_seq`, `customer_id`, `customer_name`, `total_amount`, `discount_percent`, `discount_amount`, `status`, `billing_date`, `created_by`, `cancel_reason`, `cancelled_at`, `payment_mode`, `shop_id`, `created_at`, `updated_at`, `deleted_at`, `device_id`, `sync_status`)
5. **`bill_items`** (`id`, `bill_id`, `item_id`, `item_name`, `item_price`, `quantity`, `shop_id`, `created_at`, `updated_at`, `deleted_at`, `device_id`, `sync_status`)
6. **`payments`** (`id`, `customer_id`, `bill_id`, `amount`, `mode`, `note`, `shop_id`, `created_at`, `updated_at`, `deleted_at`, `device_id`, `sync_status`)
7. **`udhari_ledger`** (`id`, `customer_id`, `bill_id`, `payment_id`, `delta_amount`, `balance_after`, `note`, `shop_id`, `created_at`, `updated_at`, `deleted_at`, `device_id`, `sync_status`)
8. **`sales_ledger`** (feeds Expense Tracker: `id`, `bill_id`, `amount`, `sale_date`, `shop_id`, `created_at`, `updated_at`, `deleted_at`, `device_id`, `sync_status`)
9. **`sync_outbox`** (local-only queue: `id`, `table_name`, `record_id`, `operation`, `payload_json`, `retry_count`, `last_error`, `created_at`)
10. **`sync_meta`** (local-only: `table_name`, `last_pulled_at`)

All bill creation (bill + lines + customer/udhari ledger + sales row + outbox entries) runs inside a single `@Transaction` in Room.

---

## 3. Proposed Additive Supabase Migrations

All migrations are **additive and backward-compatible** (web app continues working unchanged). Delivered as SQL files for your review:
- `supabase/migrations/001_add_sync_columns.sql`: Adds nullable `shop_id`, `updated_at`, `deleted_at`, `device_id` to `items`, `bills`, `bill_items`, `store_settings`, plus indexes on `(updated_at)` and `(shop_id, updated_at)`.
- `supabase/migrations/002_add_plan_and_usage.sql`: Adds `shop_plans` table (`shop_id`, `plan_name`, `status`, `expires_at`, `updated_at`) with RLS for authenticated read.
- Each SQL file includes a `-- ROLLBACK:` section at the bottom.

---

## 4. Sync Design (Phase 2)

- **Outbox Pattern:** Every local write inserts/updates the Room row (`sync_status = 'pending'`) and appends a `sync_outbox` record in the same DB transaction.
- **Triggers:** WorkManager `OneTimeWorkRequest` (debounced after bill save, on app open, on background) + `PeriodicWorkRequest` with `NetworkType.CONNECTED` and exponential backoff.
- **Push:** Upsert by `id` (idempotent). On success, mark `sync_status = 'synced'` and delete outbox row.
- **Pull:** Fetch rows where `updated_at > last_pulled_at` per table in pages (including `deleted_at IS NOT NULL`).
- **Conflict Rule:** Last-write-wins by `updated_at` for `store_settings`, `customers`, `items`. `bills` and `payments` are append-only; edits/cancellations update the same row by `id`.
- **Bill Numbers Offline:** Use per-device prefix/sequence when offline (e.g., `MM-D1-0001`) or a reserved range, keeping the `MM-` display format and guaranteeing zero collisions.
- **Auth & Plan:** Session stored in `EncryptedSharedPreferences` (offline-capable). Plan & expiry cached locally with a 7-day offline grace period; never blocks a sale.

---

## 5. Bluetooth Printing Design (Phase 3)

- **Driver:** Native ESC/POS over Bluetooth Classic (`BluetoothSocket` SPP UUID `00001101-0000-1000-8000-00805F9B34FD`) running on `Dispatchers.IO`.
- **Permissions:** Android 12+ (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`) and legacy (`BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_FINE_LOCATION`) with an in-app explanation screen.
- **Paper Widths:** Configurable `58mm` (384 dots / 32 cols) and `80mm` (576 dots / 48 cols) in Shop Settings.
- **Content:** Logo (`logo_small.jpg` rasterized to 1-bit bitmap), shop header, items, totals, UPI QR (`upi://pay?...`), footer (`Billing by Stellar Forge (www.stellarforgetech.in)`). Hindi/Marathi text rendered via `Canvas` bitmap when needed.
- **Resilience:** Handles connect, reconnect, printer off, out of range, and timeouts with clear messages and a Retry button.

---

## 6. GitHub Actions Build Setup

- **`.github/workflows/android.yml`:**
  - Runs `./gradlew lint testDebugUnitTest` on every push/PR (fails build on error).
  - Builds `assembleDebug` APK on every push to `main` and `workflow_dispatch`, uploading `app-debug.apk` as an artifact.
  - Builds signed `bundleRelease` AAB on `workflow_dispatch` or `v*` tag using GitHub Secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
  - Uploads build logs and test reports on failure.
- **`BUILD.md`:** Documents keystore generation, GitHub Secret names, APK download/install steps, and version bumping.

---

## 7. Risks & Open Questions

> [!WARNING]
> **Schema & Feature Gaps in Current Web Repo:**
> Inspecting `src/lib/supabase.js` and `src/` shows `items`, `bills`, `bill_items`, and `store_settings`. However, your prompt also mentions:
> 1. **`customers`**, **`payments/collections`**, and **`udhari_ledger`**
> 2. **GST/tax logic** and **GSTIN** on the receipt
> 3. **Expense Tracker** sales rows
> 4. **Shop plan/expiry** table
>
> **Questions before Phase 1:**
> 1. Do `customers`, `payments`, `udhari_ledger`, `expense_tracker`, or `shop_plans` already exist in your Supabase project (e.g. from another repo), or should we include their creation in our additive SQL migrations?
> 2. Should we proceed with **Kotlin + Jetpack Compose** and start **Milestone 1** (minimal Android project + GitHub Actions building `app-debug.apk`)?
