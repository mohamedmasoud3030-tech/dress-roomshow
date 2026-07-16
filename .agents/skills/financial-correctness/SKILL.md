---
name: financial-correctness
description: Protect payments, deposits, refunds, fees, sales, expenses, daily closing, balances, and reports from semantic or arithmetic errors.
---

# Financial Correctness

## Use this skill when

A task changes payment capture, deposits, refunds, penalties, retained amounts, settlements, sales, sale returns, expenses, balances, daily closing, profitability, or financial reporting.

## Financial meanings

Keep these concepts separate in data, calculations, labels, and reports:

- **cash movement:** money entering or leaving by payment method;
- **rental or sales revenue:** earned consideration under the completed business event;
- **deposit liability:** customer money held until refund or justified retention;
- **fees and retained deposits:** amounts recognized only by an explicit settlement decision;
- **expense:** showroom cost, separate from customer refunds;
- **profitability:** recognized revenue minus relevant expenses, never raw collections.

## Invariants

- Deposits are liabilities until refunded or retained; they are not rental revenue.
- Financial movements are append-only. Corrections use linked refunds, reversals, or adjustments.
- A refund is an outbound cash movement linked to the original business record.
- Settlement-only entries must not distort cash totals.
- Daily close is based on actual cash movement grouped by payment method and close period.
- Reports must state whether totals are collected, outstanding, recognized, held, refunded, retained, or paid as expenses.
- Financial writes and the related reservation, delivery, return, sale, or audit transition commit as one operation.

## Change method

1. Write the accounting meaning of every amount before changing code.
2. Identify the event that recognizes revenue or a fee; do not infer it merely from reservation existence.
3. Trace the same movement through customer balance, reservation/sale history, daily closing, reports, backup/restore, and audit.
4. Prefer one canonical command for each financial action. A quick sale is a one-line invoice, not a separate financial model.
5. Preserve original records and add linked corrective movements instead of overwriting history.
6. Use currency-safe arithmetic and explicit rounding at documented boundaries.

## Mandatory tests

- full and partial payment;
- mixed payment methods;
- deposit collected, fully refunded, partially retained, and fully retained;
- late and damage fees;
- refund after a closed day;
- sale and sale return;
- cancellation with and without prior money movement;
- duplicate command/replay protection where relevant;
- forced failure between financial and operational writes;
- daily-close cash reconciliation;
- report reconciliation between source movements and displayed totals.

## Completion rule

A financial change is complete only when source movements, liabilities, balances, daily close, reports, audit, and rollback behavior reconcile exactly with no double counting.
