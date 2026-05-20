# Dress Roomshow — نظام إدارة محل الفساتين

نظام إدارة محل فساتين المناسبات — أوف-لاين أولاً، بدون إنترنت مطلوب.

## Run & Operate

- `pnpm --filter @workspace/dress-showroom run dev` — run the dress-showroom app
- `pnpm --filter @workspace/dress-showroom run typecheck` — typecheck
- `pnpm install` — install all workspace packages

## Stack

- **Frontend**: React 19 + Vite 7 + TypeScript 5 + Tailwind CSS v4
- **Routing**: React Router DOM v7
- **Forms**: react-hook-form v7 + Zod v3 + @hookform/resolvers
- **Storage**: localStorage (web/PWA) — Tauri SQLite (desktop, future)
- **Font**: Cairo (Google Fonts) — Arabic RTL

## Architecture

```
artifacts/dress-showroom/src/
├── app/App.tsx                      # Route definitions
├── services/localDatabase.ts        # PRIMARY data adapter (localStorage ↔ Tauri SQLite)
├── shared/utils/
│   ├── date.ts                      # getTodayISO(), formatDateAr()
│   └── format.ts                    # formatMoneyOMR() → OMR currency
├── components/
│   ├── layout/AppLayout.tsx         # Sidebar + mobile bottom nav
│   └── shared/                      # PageHeader, SummaryCard, Modal, StatusBadge
└── features/
    ├── dashboard/                   # Real-time KPI from localDatabase
    ├── dresses/                     # CRUD: add + list + filter + status badges
    ├── customers/                   # CRUD: add + list + filter + balance tracking
    ├── reservations/                # CRUD: create + list + cancel + overlap check
    ├── payments/                    # CRUD: add payment linked to reservation
    ├── delivery-return/             # Deliver + Return flows (status automation)
    ├── expenses/                    # CRUD: add + delete + category filter
    └── reports/                     # Today report, financial summary, dress performance
```

## Where things live

- **DB schema boundary**: `src/services/localDatabase.ts` — all reads/writes go through here
- **Money format**: `src/shared/utils/format.ts` → `formatMoneyOMR()`
- **Date utilities**: `src/shared/utils/date.ts` → `getTodayISO()`, `formatDateAr()`

## Architecture Decisions

- **Adapter pattern**: `localDatabase.ts` is the only file that touches localStorage. When Tauri SQLite support is added, only this one file changes.
- **No React Query**: Simple `useState` + callback pattern. State is refreshed explicitly after mutations — keeps bundle small and avoids network-oriented abstractions.
- **Tailwind v4** via `@tailwindcss/vite` plugin — no `tailwind.config.ts` needed.
- **Zod v3** (from `import { z } from 'zod'`) — **not** `zod/v4` — required for `@hookform/resolvers` compatibility.
- **Dress status automation**: reservation → `reserved`, delivery → `rented`, return → `available/laundry/maintenance/damaged` based on condition.
- **Reservation payment tracking**: every `addPayment()` call recalculates `paidAmount` and `remainingAmount` on the linked reservation.
- Sidebar visible on desktop (≥md), bottom nav visible on mobile (<md).

## Product

8 fully-wired modules:
1. **Dashboard** — real-time KPIs, today's pickups/returns, alerts
2. **Dresses** — add, filter by status/category/color, summary cards
3. **Customers** — add, track balance, filter by status/balance
4. **Reservations** — create (overlap-checked), cancel, status lifecycle
5. **Delivery-Return** — deliver form (confirmed→delivered→rented), return form (delivered→returned, dress status automation)
6. **Payments** — add payment linked to reservation, auto-updates remaining balance
7. **Expenses** — add, delete, category filter, financial summary
8. **Reports** — today summary, financial P&L, dress performance table, customer balances

## User Preferences

- Arabic RTL first. Font: Cairo.
- Currency: Omani Rial (ر.ع) — 3 decimal places.
- Offline-first (no cloud, no Supabase).
- Stack: React + Vite + TypeScript + Tailwind + Tauri (desktop) + SQLite (via localDatabase adapter).
- Do NOT use localStorage as the architectural source of truth — it's the web fallback only.

## Gotchas

- Always import `z` from `'zod'` (not `'zod/v4'`) for `@hookform/resolvers` compatibility.
- `localDatabase.ts` is the ONLY file that should touch `localStorage` directly.
- `generateId()` and `generateNumber()` live in `localDatabase.ts` — import from there, not from a separate utils file.
- Tailwind v4 uses `@import "tailwindcss"` in CSS, not `@tailwind base/components/utilities`.
- The vite.config.ts requires `PORT` and `BASE_PATH` env vars — provided by the Replit workflow system.
- Do not add Radix/shadcn components (they're not installed). All UI is raw Tailwind.
