# Local Database Architecture (Phase 2 MVP)

## Scope decision
This architecture is intentionally scoped to a **single showroom** desktop app with **offline-first runtime**.

- Primary runtime database: local SQLite in Tauri desktop.
- Web/PWA/dev fallback: existing in-memory mocks/local state.
- Supabase: **not integrated in this phase**; planned later as backup/sync only.

## Where the database lives
For desktop (Tauri), SQLite file is created in the OS app data directory resolved by Tauri `app.path().app_data_dir()`.

- File name: `dress_roomshow.db`
- Strategy: user-specific app data path (outside repo/source tree)
- Reason: persistent across app restarts, safe for packaged EXE install

## Why local DB is primary
- Desktop showroom operations must continue offline.
- Fast local reads/writes without network dependency.
- Simplifies MVP reliability for one physical showroom.

## Future Supabase role (deferred)
Supabase will be added in a later phase only for:
- cloud backup
- optional cross-device sync

Supabase will **not** replace local runtime DB for this MVP plan.

## Initial SQLite schema (one-showroom MVP)
The app initializes these tables idempotently (`CREATE TABLE IF NOT EXISTS`):

1. `dresses`
2. `customers`
3. `reservations`
4. `delivery_returns`
5. `payments`
6. `expenses`

### Schema principles used
- Text primary keys (`id TEXT PRIMARY KEY`) suitable for local + future cloud sync.
- Includes `created_at` and `updated_at` in all tables.
- Lightweight future-sync metadata included: `sync_status`, `synced_at`.
- **No** `company_id`, `tenant_id`, `organization_id`.
- No advanced ERP/inventory/ledger/workflow/AI analytics tables.

## Initialization behavior
Initialization is performed through Tauri commands and is idempotent:
- open DB in app data directory
- create tables if missing
- no destructive reset
- no automatic seed data

## Frontend data access boundary
Frontend pages do not execute SQL directly.

Layering used:
1. `src/services/localDatabase.ts` → Tauri command adapter (`invoke` boundary)
2. feature services (e.g. customers) map records and apply fallback behavior
3. pages call feature services

## First persisted vertical slice
Implemented slice: `customers`

- `CustomersPage` loads local DB customers when available (desktop Tauri mode).
- Add-customer persists via local DB command.
- If local DB is unavailable (web/PWA/dev), behavior falls back safely to in-memory state + existing mock list.

## Intentionally deferred
- Supabase integration and auth
- bi-directional sync engine / conflict resolution
- background sync jobs
- multi-showroom/multi-tenant modeling
- complex inventory/warehouse/accounting workflow expansions
