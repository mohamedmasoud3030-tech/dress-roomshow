# Shared Component Architecture

**Status:** VERIFIED COMPLETE (architecture decision); current implementation is intentionally incremental. No framework/design-library replacement is planned.

## Principles

- Keep React/Tailwind/current aliases, persistence, and feature ownership.
- A shared component owns semantics, states, and responsive behavior; it does not own domain commands.
- Feature components own labels, business validation, and command calls.
- Prefer a small canonical surface over a universal component with dozens of flags.
- Every reusable control supports Arabic RTL, long content, keyboard focus, and 44px touch targets.

## Existing component inventory

| Existing component | Classification | Canonical responsibility | Usage/notes | Migration priority |
|---|---|---|---|---|
| `AppShell` | KEEP / IMPROVE | private route chrome, persistence status, outlet, mobile nav | already source of truth for shell | P0 |
| `DesktopNavigation` / `MobileNavigation` / `MobileMoreMenu` | KEEP / IMPROVE | responsive navigation from `navigationGroups` | keep one nav model, improve current-route context and focus/scroll lock | P0 |
| `PageHeader` | KEEP / IMPROVE | eyebrow/title/description; add action slot without domain coupling | many pages need consistent primary action | P0 |
| `Section` | KEEP | heading/description/action/content grouping | use for page regions, not every card | P0 |
| `FilterBar`, `SearchFilter`, `SelectFilter` | KEEP / IMPROVE | search/filter region and label semantics | standardize date/status/filter reset | P0 |
| `FormField`, `TextField`, `MoneyField`, `SelectField`, `TextAreaField` | KEEP / IMPROVE | labels, IDs, hints, validation wiring | migrate hand-built forms gradually | P0 |
| `FormActions` | KEEP / IMPROVE | save/cancel/loading action placement | migrated to canonical `Button`; sticky mobile option for long forms | P0 |
| `ValidationSummary` | KEEP / ADD | cross-field error index for long forms/wizards | implemented for reservation wizard; inline errors remain authoritative | P1 |
| `Modal` | KEEP / IMPROVE | dialog focus/scroll/keyboard lifecycle | current touch fix; close action uses `IconButton`; add mobile sheet variants only if repeated | P0 |
| `SearchableSelect` | KEEP | searchable combobox/listbox for large option sets | maintain native select for small fixed sets | P0 |
| `Stepper` | KEEP | validated multi-step progress/navigation | reservation only currently; make semantics generic | P1 |
| `ViewModeToggle` | KEEP | explicit grid/list preference | only where both patterns serve a task | P1 |
| `StateViews` (`LoadingState`, `ErrorState`, `EmptyState`) | KEEP / IMPROVE | standard lifecycle states | connect `EmptyState` action slot and retry labels | P0 |
| `PersistenceErrorBanner`, `UserFacingErrorAlert`, `PersistenceErrorBoundary` | KEEP / MERGE naming | error mapping vs boundary vs banner remain separate responsibilities | standardize copy and retry | P0 |
| `StorageCapacityIndicator` | KEEP | storage health warning | keep in shell/preferences, not repeated page metrics | P1 |
| `SummaryCard` | KEEP / RESTRICT | compact decision metric with source link | no decorative stats; require actionable hint | P1 |
| `FilterBar` inline page patterns | IMPROVE/MIGRATE | canonical filter region | several pages still hand-build controls | P0 |
| page-local action button class constants | MERGE | use named `Button`/`IconButton` contracts | avoid arbitrary one-off variants | P1 |
| page-local table/list/card markup | IMPROVE | migrate dataset-specific rows to canonical containers, not generic data engine | business fields stay local | P1/P2 |
| `LandingHeader/Footer/Hero/...` | KEEP CUSTOM | storefront section components | public page is its own content architecture | P1 |
| feature modals (`Add*`, `Edit*`, `Complete*`) | KEEP FEATURE-OWNED | domain-specific form/dialog composition | standardize shell/fields/actions, do not merge domains | P0/P1 |
| `ConditionPhotoCapture`, `BarcodeScanner` | KEEP FEATURE/PLATFORM | hardware boundary with denial/manual fallback | do not hide permission state | P1 |

## Canonical component set

### Layout

#### `AppShell`

- **Responsibility:** private navigation, page outlet, global persistence/update/error notices.
- **Variants:** private authenticated only; public storefront does not reuse it.
- **Responsive:** desktop sidebar at `lg`; mobile bottom quick nav + More sheet; safe-area padding.
- **RTL/accessibility:** `dir=rtl`; landmarks `header/nav/main`; skip link; active link announced.
- **Anti-pattern:** domain content or command calls inside shell.

#### `PageContainer`

- **Responsibility:** max width, horizontal padding, bottom safe-area, page vertical rhythm.
- **Variants:** `standard`, `wide` for tables/reports, `narrow` for auth/details.
- **Responsive:** 16px phone, 24px tablet/desktop; never rely on negative margins for primary content.
- **Long content:** `min-w-0`, wrapping identifiers.

#### `PageHeader`

- **Responsibility:** page identity and action hierarchy.
- **API contract (implemented):** `eyebrow`, `title`, optional `description`, optional `actions` ReactNode, optional `status` ReactNode.
- **States:** normal/loading/disabled/permission; action labels remain text-first.
- **Anti-pattern:** put filters or whole forms in header; use a filter region below.

#### `Section`

- **Responsibility:** named content region with optional action.
- **Variants:** `default`, `warning`, `danger`, `compact`.
- **Accessibility:** heading level supplied by page; action is not only an icon.

#### `ResponsiveGrid`, `Stack`, `Inline`

- **Status:** planned canonical primitives, implement only when a second/third repeated pattern is migrated.
- **Rules:** use CSS grid/flex with explicit breakpoints; no domain props; `min-w-0` children; wrap long Arabic text.

### Actions and navigation

#### `Button`

- **Implemented variants:** `primary`, `secondary`, `quiet`, `danger`; sizes `sm`/`md`/`lg`; `loading`, `disabled`.
- **Planned variant:** `success` only if a real success action needs a distinct semantic treatment.
- **Contract:** native `<button>` unless navigation; `aria-busy`, disabled during submit, visible label.
- **Mobile:** min-height 44px; full-width in form action area when useful.
- **RTL:** icon order follows reading direction; use logical spacing.

#### `IconButton`

- **Responsibility:** one compact action with mandatory accessible label/tooltip.
- **Use only:** universally recognized low-risk actions (close, refresh, zoom, remove) or paired with visible text elsewhere.
- **No use:** archive/delete/financial state mutation as unlabeled icon-only action.

#### `ActionMenu`

- **Responsibility:** overflow contextual actions for a record.
- **Rules:** destructive actions separated and labelled; menu traps focus and closes on Escape/outside click; touch target 44px.

#### `ButtonGroup`

- **Responsibility:** mutually related choices/actions (view mode, usage chips).
- **Accessibility:** `role=group`; selected state via `aria-pressed`/tabs semantics.

#### `Link`, `Tabs`, `Breadcrumbs`, `Pagination`

- **Status:** keep native links; introduce canonical `Tabs` for future preferences/detail subtasks; breadcrumbs for detail/public piece.
- **Rules:** route links use router; same-page anchors use `<a>`; pagination only after measured scale; tabs do not hide unsaved form state.

#### `FilterBar`

- **Responsibility:** search and filters, separated from content list.
- **Variants:** `inline`, `stacked`, `drawer` (mobile), `date-range`.
- **Behavior:** filter changes are labelled; clear all available; query preserved on detail return.

### Forms

#### `FormField`

- **Responsibility:** label/control/hint/error/required semantics.
- **States:** normal/focus/invalid/disabled/loading; error `role=alert`, `aria-invalid`, `aria-describedby`.
- **Rules:** labels never placeholders-only; units adjacent; `dir=ltr` for phone/email/codes.

#### `Input`, `Textarea`, `Select`, `Combobox`, `SearchInput`

- **Status:** `FormField` wrappers are canonical; use native controls for simple values, `SearchableSelect` for large entity lists.
- **Mobile:** 16px touch input; correct `inputMode`/autocomplete; date/time native where reliable plus validation.
- **Long content:** textareas resize/scroll; select options have empty/unavailable states.

#### `DateTimeControls`

- **Status:** canonical pattern to extract from reservation/appointment/availability/waitlist.
- **Rules:** date/time separately labelled; timezone/local showroom semantics shown; range validation before submit; no silent default that changes business date.

#### `Checkbox`, `RadioGroup`, `Switch`

- **Use:** preference booleans (switch only when immediate setting state), mutually exclusive financial/usage choices (radio), selection lists (checkbox).
- **Anti-pattern:** use switch for a destructive commit or a filter that has no explicit state label.

#### `FileUpload`

- **Status:** feature-owned image wrapper around current image platform.
- **Required:** preview, size/type validation, partial upload retention, retry/remove, camera/gallery semantics.

#### `FormActions`

- **Responsibility:** submit/cancel placement and loading.
- **Mobile:** column/reverse order with primary action reachable above safe area; sticky only if it does not cover validation.
- **Failure:** no unmount/reset on recoverable error.

#### `ValidationSummary`

- **Status:** add when forms exceed one screen or wizard has cross-field rules.
- **Contract:** links to first invalid fields; inline errors remain source of truth.

### Data display

#### `Card`, `List`, `ListItem`

- **Responsibility:** predictable identity/status/action composition.
- **Variants:** `visual`, `compact`, `queue`, `summary`; no universal domain fields.
- **Rules:** card owns one item; list owns ordering; primary action text visible.

#### `DataTable`

- **Status:** implemented and used by the audit log; migrate additional comparison-heavy report surfaces incrementally.
- **Contract:** column definitions with priority (`primary`, `secondary`, `optional`), row key, caption, empty state, and responsive transform. Domain renderers retain labels/actions.
- **Mobile:** default transform to priority-labelled cards; contained horizontal table is kept on desktop for comparison.
- **Accessibility:** semantic table, caption when supplied, labelled mobile list, and visible text values; sortable headers remain feature-owned until a real sortable table is migrated.

#### `DetailField` / `KeyValueList`

- **Status:** implemented as a small label/value primitive for detail and reconciliation surfaces.
- **Responsibility:** stable label/value grouping, status/value formatting, and long content handling.
- **Rules:** required/unknown/empty values are explicit; not a generic form field.

#### `Stat`, `Badge`, `StatusIndicator`

- **Status:** keep but restrict to decision context.
- **Rules:** status has text, not color alone; stat links to source or threshold; badges do not replace a sentence for critical state.

#### `Timeline` / `ActivityItem`

- **Use:** audit, appointment chronology, service history, reminders.
- **Contract:** time + actor/source + action + summary; RTL line and screen-reader order are explicit.

#### `ChartContainer`

- **Use:** inventory performance/trend only when a comparison/threshold exists.
- **Required:** accessible summary/table, period/filter context, no chart-only decision.

### Feedback and overlays

#### `Alert` / `Banner`

- **Use:** persistent page or global issue. `role=alert` only for urgent failures; `role=status` for success.
- **Rules:** explain impact and next action; no auto-disappearing critical error.

#### `Toast`

- **Status:** not a priority foundation. Existing inline feedback is safer for financial/record changes. Introduce only for low-risk non-blocking actions with persistent status elsewhere.

#### `Dialog` / `Drawer` / `Sheet`

- **Current:** `Modal` is canonical dialog/sheet shell; feature form remains owner.
- **Requirements:** focus return/trap, Escape, backdrop, body scroll lock without disabling sheet touch, visual viewport sizing, safe-area padding, labelled title.
- **Use:** create/edit/confirm; not full record history on phone.

#### `Popover` / `Tooltip`

- **Status:** use sparingly; visible labels beat hover tooltip on touch. Any critical information must be in DOM text.

#### `Skeleton`, `EmptyState`, `ErrorState`, `PermissionState`, `OfflineState`

- **Status:** consolidate `StateViews` plus permission/offline variants.
- **Contract:** one message, one consequence, one next action; preserve filters/input where relevant.
- **No fake data:** skeleton only while loading; no demo metrics in production.

## Canonical migration order

1. `PageContainer`, `PageHeader` action slot, `FilterBar`, `FormField/FormActions`, state views.
2. `Button/IconButton`, `ActionMenu`, `DetailField`, `StatusIndicator`.
3. `DataTable` for financial/audit/report pages after contract tests.
4. `Tabs`/detail shell for preferences/customers/reservations.
5. Remove legacy page-local wrappers only after import/DOM tests pass.

## Deprecation rule

No existing component is removed merely because a cleaner abstraction is possible. A component is deprecated only after:

- every consumer has migrated,
- route and command behavior is unchanged,
- keyboard/RTL/mobile states are covered,
- full tests/build pass,
- `git grep` proves no runtime consumer remains.
