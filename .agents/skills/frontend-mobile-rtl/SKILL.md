---
name: frontend-mobile-rtl
description: Guide Arabic RTL, mobile-first, accessible user-facing work without separating UI from the underlying showroom workflow.
---

# Frontend Mobile RTL

## Use this skill when

A task changes a route, component, form, navigation flow, table/card view, modal/drawer, print layout, camera/barcode flow, responsive behavior, or any user-visible state.

## Product contract

- Arabic RTL is the primary interface, not a translated afterthought.
- Mobile is the primary operating surface; tablet and desktop must remain efficient.
- Existing design tokens and shared components are preferred over introducing another UI system.
- UI completion requires the connected business command, persistence result, audit result, and user feedback to succeed together.

## Implementation method

1. Start from the operator's complete task, not from an isolated screen mockup.
2. Reuse shared layout, form, feedback, and navigation primitives before adding local variants.
3. Keep primary actions obvious and reachable with one hand on common phone sizes.
4. Provide loading, empty, validation, permission/blocked, failure, retry, and success states.
5. Preserve entered form data after recoverable failures and focus the first invalid field.
6. Use semantic HTML, visible labels, keyboard access, logical focus order, and meaningful accessible names.
7. Verify RTL behavior for icons, directional controls, numbers, currency, dates, tables, drawers, and print output.
8. Keep destructive actions separated, clearly named, confirmed, and consistent with archive/rollback rules.
9. For camera/barcode features, support denied permission, unavailable hardware, retry, and manual fallback.
10. Do not hide business validation in the UI only; services must enforce the same rule.

## Responsive verification

Check at minimum:

- narrow phone portrait;
- wide phone or phone landscape where relevant;
- tablet;
- desktop;
- long Arabic labels and large numeric values;
- virtual keyboard open on forms;
- scrolling with sticky headers/actions;
- print preview when the task affects contracts, invoices, receipts, or reports.

## Evidence required

For user-facing changes, attach or record:

- route and scenario tested;
- viewport/device class;
- screenshots or browser evidence for key states;
- keyboard/focus verification for changed interactions;
- confirmation that real service behavior, not mock-only behavior, was exercised.

## Completion rule

A screen is complete only when the full operator workflow works on phone, tablet, and desktop; errors are recoverable; RTL is correct; and the resulting business state survives relaunch.
