---
name: showroom-domain-workflows
description: Protect LENA's connected showroom workflows across inventory, customers, reservations, delivery, return, inspection, service, and sales.
---

# Showroom Domain Workflows

## Use this skill when

A task changes inventory, customer history, reservations, delivery, returns, inspection/service, sales, item lifecycle, or any workflow that updates more than one of these areas.

## Required context

Read:

- `docs/BUSINESS_MODEL.md`
- the active phase in `docs/FINAL_DELIVERY_PLAN.md`
- the current services, types, routes, and tests for every affected workflow

Treat the application as one showroom operating system. A page is not complete when only its own collection changed.

## Invariants

- Inventory identity is immutable. Codes and barcodes are unique and are never reused.
- Historical records retain stable entity IDs plus display snapshots needed for readable history.
- Referenced customers and inventory are archived, not hard-deleted.
- Date-derived reservation availability is separate from physical item lifecycle state.
- Delivery requires the configured upfront amount or an explicit, auditable override.
- Every physical rental return and sale return enters inspection/service before becoming available.
- Audit history commits with the business operation, not as an optional follow-up write.
- Production startup is empty unless demo data is explicitly and reversibly loaded.

## Workflow method

1. Map the complete state transition before editing code: actor, starting state, command, writes, money effect, audit event, and resulting state.
2. Inspect every consumer of the changed state, including reports, daily closing, backup/restore, item/customer history, and Tauri relaunch behavior.
3. Put business transitions in domain/service commands. Do not scatter related writes across page components.
4. Reject invalid transitions explicitly and return actionable Arabic error messages.
5. Preserve old readable history when names, phones, codes, or labels change.
6. Add tests for allowed transitions, blocked transitions, replay/idempotency where relevant, and failure after each write boundary.

## Minimum scenario coverage

For the affected workflow, test the normal path plus the relevant edge cases:

- overlapping or buffered reservations;
- blocked customers;
- unavailable, damaged, sold, inactive, laundry, or maintenance items;
- delivery with insufficient payment;
- late return, damage fee, retained deposit, and refund;
- cancellation after financial activity;
- sale return routed to inspection;
- archive attempts against referenced records;
- relaunch after the operation.

## Completion rule

Do not claim the workflow complete until its physical state, financial effect, audit event, histories, reports, backup/restore, and relaunch behavior agree.
