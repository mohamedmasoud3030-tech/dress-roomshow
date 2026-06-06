# Dress Roomshow Domain Rules

These rules protect showroom operations and financial consistency.

## Reservation rules

- A dress cannot be double-booked for overlapping reservation or preparation windows.
- Availability checks must consider reservation status, delivery state, return state, and configured preparation time.
- A cancelled reservation must not silently erase its audit history.

## Delivery and return rules

- Delivery must reference an existing reservation and customer.
- Return processing must record the actual return state before the dress becomes available again.
- Damage, delay, or other penalties must remain explicit and traceable.

## Payment rules

- Deposits, remaining balances, penalties, direct sales, refunds, and expenses must remain distinguishable.
- Financial summaries and daily closing must derive from recorded transactions rather than editable summary totals.
- Corrections must preserve history instead of silently rewriting past records.

## Storage and backup rules

- Web and PWA operation use local browser storage.
- Tauri desktop operation persists snapshots in local SQLite.
- Backup restore must validate the imported snapshot before replacing active local state.
- Storage migrations must be versioned and backward-aware.

## Release requirement

Any change touching reservations, delivery, returns, payments, daily closing, storage, or restore behavior must include targeted tests for the affected rules.