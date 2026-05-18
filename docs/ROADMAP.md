# Dress roomshow Roadmap

## Starting plan

The first release is limited to:

- Dresses
- Customers
- Reservations
- Delivery and return
- Payments
- Expenses
- Simple reports

## Approved stack

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Tauri for Windows EXE
- PWA for web

## Milestones

### 1. Foundation

- Create Vite React TypeScript app
- Add Tailwind CSS
- Add routing
- Add RTL app shell
- Add module placeholders

### 2. Supabase

- Create schema
- Add auth profiles
- Add storage for dress images
- Add RLS policies

### 3. Dresses

- Add dress CRUD
- Add image upload
- Add search and filters
- Add dress details

### 4. Customers

- Add customer CRUD
- Add customer details
- Add reservation/payment history

### 5. Reservations

- Create reservations
- Check availability
- Prevent date overlaps
- Add reservation details and status flow

### 6. Delivery and return

- Deliver dress
- Return dress
- Track late fees, damage fees, and deposit refund

### 7. Finance

- Add payments
- Add expenses
- Calculate paid and remaining amounts

### 8. Reports

- Today report
- Date range report
- Dress performance report

### 9. Release

- PWA install support
- Tauri Windows build
- Demo data
- Final testing
