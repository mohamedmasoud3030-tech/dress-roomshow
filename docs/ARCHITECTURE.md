# Architecture

## Scope

Dress roomshow is a shop management app for occasion dresses.

The first version follows the starting plan only:

- Dresses
- Customers
- Reservations
- Delivery and return
- Payments
- Expenses
- Simple reports

## Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase
- Tauri for Windows EXE
- PWA for web

## App shape

One shared React application is used for both outputs:

- Web PWA
- Windows desktop app through Tauri

Supabase is the single source of truth for authentication, database, and dress image storage.

## Current product decisions

- Arabic RTL first
- Online-first
- Single store only
- Admin and staff roles only
- One reservation has one customer and one dress
- No full POS in the first release
- No offline sync in the first release

## Module folders

- src/features/dashboard
- src/features/dresses
- src/features/customers
- src/features/reservations
- src/features/delivery-return
- src/features/payments
- src/features/expenses
- src/features/reports

## Stop point before first real module

Foundation is complete when the app shell, configuration files, database foundation, documentation, and release placeholders are in place. The first real module after that is Dresses.
