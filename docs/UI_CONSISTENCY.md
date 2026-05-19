# UI Consistency Guidelines

This document defines the shared UI direction for Dress roomshow after completing the starting plan.

## Shared primitives

Use these shared components for future cleanup work:

- `PageHeader`
- `SummaryCard`

## Page structure

Each feature page should follow this order:

1. Page header
2. Summary cards
3. Filters panel
4. Data cards or table
5. Empty state

## Visual rules

- Use rounded `2xl` cards.
- Use `border-slate-200` for card borders.
- Use `bg-white` for primary content surfaces.
- Use `shadow-sm` for cards.
- Use violet for main actions.
- Use emerald for positive money/status.
- Use red for negative money/status.
- Use amber for warning/status requiring attention.

## Current cleanup scope

This pass creates reusable primitives only. Applying them across all pages should be done in small follow-up PRs to keep risk low and CI stable.
