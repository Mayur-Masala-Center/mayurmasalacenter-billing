# SYNC.md — Outbox, Conflict Rules & Bill Numbering

## 1. Outbox Pattern
Every write operation against the local database (`bills`, `bill_items`, `customers`, `items`, `shop_settings`, `udhari_ledger`, `sales_ledger`) occurs atomically within a Room transaction alongside its corresponding `sync_outbox` record.

### Schema:
- `id`: Client-generated UUID v4
- `tableName`: Destination Supabase table
- `recordId`: UUID of the local entity
- `operation`: `insert`, `update`, `delete`
- `payloadJson`: JSON payload serialized without circular references
- `retryCount`: Failed push attempts counter
- `lastError`: Error message if last sync failed

## 2. Push & Inbound Pull Workflows

### Push (Outbound):
1. `SyncWorker` pulls pending entries (limit 50) from `sync_outbox`.
2. Invokes `SupabaseClientWrapper.upsertRow(table, payload)`.
3. If HTTP 200/201: deletes the outbox entry.
4. If failed: increments `retryCount`, records `lastError`, and schedules exponential backoff.

### Pull (Inbound):
1. Runs for each syncable table: `items`, `customers`, `bills`, `bill_items`, `store_settings`, `udhari_ledger`, `sales_ledger`.
2. Queries rows where `updated_at >= lastPulledAt`, ordered by `(updated_at ASC, id ASC)` in pages of 100.
3. Applies entire page in one atomic Room transaction (`db.withTransaction`).
4. Updates `lastPulledAt` **only after the entire page is committed**.
5. Pulled rows are marked `syncStatus = "synced"` so they **never re-enter the outbox** (preventing infinite sync loops).

## 3. Conflict Rules
- **Last-Write-Wins**: For `items`, `customers`, and `store_settings`.
- **Pending Local Protection**: If a local row has `sync_status == "pending"` and `updated_at > server_updated_at`, the server row will not overwrite the unpushed local edit.
- **Append-Only Rows**: `bills`, `udhari_ledger`, and `sales_ledger` match strictly on UUID primary keys.

## 4. Collision-Free Offline Bill Numbering
To guarantee zero bill number collisions across multiple devices operating offline without an active internet connection:
- Each installation generates a persistent UUID in `DeviceManager`, yielding a 4-character prefix (e.g., `E7A3`).
- Offline bill format: `MM-[DevicePrefix]-[Seq6]` (e.g., `MM-E7A3-000001`).
- Online/server numbering uses sequential `MM-000123`.
