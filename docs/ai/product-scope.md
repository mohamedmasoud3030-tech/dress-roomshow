# Dress Roomshow Product Scope

## Product definition

A local-first Arabic RTL application for operating one dress showroom.

## Supported flow

```text
Dresses → Customers → Reservations → Delivery → Return → Payments → Expenses → Daily Closing → Reports
```

## Supported capabilities

- dress inventory and availability
- customer records
- reservation scheduling and preparation windows
- delivery and return handling
- deposits, remaining balances, penalties, expenses, and direct sales
- daily closing, reports, audit visibility, and backup restoration
- web, PWA, and Tauri desktop operation

## Hard boundaries

- One showroom only.
- Local-first operation only.
- Do not add multi-showroom SaaS, cloud synchronization, or user-role systems unless explicitly approved.
- Do not replace the current storage model casually.
- Do not add unrelated features before release-readiness defects are resolved.

## UX direction

- Arabic RTL is the primary interface.
- Operational screens must remain usable on desktop and mobile.
- Tauri desktop behavior and PWA behavior must not regress.