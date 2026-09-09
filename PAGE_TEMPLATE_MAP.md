# Page Template Map

**Status:** VERIFIED COMPLETE (template decisions; gradual implementation planned).

## Template catalog

### `PublicStorefrontTemplate`

- **Use:** `/landing`.
- **Regions:** public header/nav → hero promise → category entry → catalogue/filter → trust/services → FAQ/contact → footer → persistent contact CTA.
- **Width/density:** full-width dark/light bands; catalogue max-width 7xl; visual cards.
- **Responsive:** one-column reading order on phone; two-column hero and 3-column catalogue on wide screens; fixed CTA uses safe area.
- **States:** profile/catalogue loading, partial warning, empty/no-results, item unavailable, contact fallback.
- **Do not use:** private operational lists or financial ledgers.

### `PublicRecordDetailTemplate`

- **Use:** `/piece/:code`.
- **Regions:** breadcrumb → media → identity/status → key values → price/decision → primary contact → description → related pieces → footer.
- **Responsive:** media first on phone; two-column at `lg`.
- **Do not use:** private dress detail; private data/history never enters this template.

### `AuthTemplate`

- **Use:** `/login`.
- **Regions:** brand/context → form → recovery → auth error/retry.
- **Responsive:** narrow card, one-column fields, full-width action on phone.
- **Do not use:** account management or public customer registration.

### `OverviewTemplate`

- **Use:** dashboard `/` after authentication.
- **Regions:** page header → urgent alerts → today queues → blockers/status → shortcuts → setup/support.
- **Density:** concise operational summaries; every summary links to work.
- **Do not use:** reports page if no decision/action attached.

### `IndexManagementTemplate`

- **Use:** inventory, accessories, customers, reservations, sales, payments, expenses, waitlist, reminders.
- **Regions:** page header/action → feedback → filter/search → view mode → list/card/table → empty/no-results → detail/modal outlet.
- **Responsive:** filters stack or move to sheet; cards/list on phone; table/list desktop.
- **Do not use:** a dataset whose meaning is chronological progress or guided scanning.

### `OperationalQueueTemplate`

- **Use:** delivery/return, service, appointments, waitlist/reminders where due work is primary.
- **Regions:** deadline/risk summary → queue filters → grouped statuses → item action → detail/evidence.
- **Responsive:** one full-width task card and bottom action on phone; dense queue desktop.
- **Do not use:** arbitrary catalogue browsing or immutable ledgers.

### `RecordDetailTemplate`

- **Use:** private dress detail, design detail, future customer/reservation/sale details.
- **Regions:** back/breadcrumb → identity/status → action rail → grouped details → related records/history → print/export.
- **Responsive:** action first and sections collapsible on phone; two-column desktop.
- **Do not use:** a create/edit form or a dashboard summary.

### `WizardFormTemplate`

- **Use:** reservation; future multi-step stocktake if extracted.
- **Regions:** stepper → current panel → validation summary → previous/next → final review/commit.
- **Responsive:** sheet/full-height touch-safe phone; centered max-width desktop.
- **Do not use:** a simple 3-field create form.

### `SimpleFormTemplate`

- **Use:** appointments, customer, accessory, expense, payment, service task, profile subforms.
- **Regions:** labelled groups → inline errors → form actions.
- **Responsive:** one column phone; 2 columns only for independent fields desktop.
- **Do not use:** financial reconciliation or a queue with repeated records.

### `ReconciliationTemplate`

- **Use:** daily closing, financial detail/report sections.
- **Regions:** period/control → readiness/variance → totals by semantic type → source breakdown → explicit close/export.
- **Responsive:** summary then expandable rows phone; table wide.
- **Do not use:** generic dashboard cards.

### `ReportTemplate`

- **Use:** reports, inventory performance.
- **Regions:** question/period → conclusion/threshold → table → optional chart → drill-down/export.
- **Responsive:** text/table equivalent always available; chart below or horizontally contained.
- **Do not use:** when the user is expected to mutate state immediately; link to source queue instead.

### `SettingsTemplate`

- **Use:** `/preferences` and future nested admin sections.
- **Regions:** settings index/section nav → one task form → consequence/help → save status → destructive/data-safety area.
- **Responsive:** accordion/section stack phone; sidebar/subnav + two-column fields desktop.
- **Do not use:** daily staff operations.

### `DataSafetyTemplate`

- **Use:** backup/cloud copies/storage/reset subsection of preferences.
- **Regions:** current capacity/status → download → restore → verify → reset last.
- **Responsive:** full-width action cards; destructive red zone isolated.
- **Do not use:** general dashboard.

### `RecoveryTemplate`

- **Use:** NotFound, permission denied, cloud failure, auth error.
- **Regions:** what happened → impact → one recovery action → safe navigation.
- **Responsive:** centered and readable at every width.
- **Do not use:** validation errors that belong next to a field.

## Route-to-template map

| Route | Template | Custom notes |
|---|---|---|
| `/` anonymous | `PublicStorefrontTemplate` via redirect | Root gate only; no duplicate login |
| `/` signed-in | `OverviewTemplate` | CloudDataGate wraps it |
| `/landing` | `PublicStorefrontTemplate` | custom public sections retained |
| `/piece/:code` | `PublicRecordDetailTemplate` | public data projection only |
| `/login` | `AuthTemplate` | auth/recovery state |
| `/inventory` | `IndexManagementTemplate` | visual card + list mode |
| `/inventory/:code` | `RecordDetailTemplate` | lifecycle/history/actions |
| `/designs/:code` | `RecordDetailTemplate` | variant matrix + linked pieces |
| `/accessories` | `IndexManagementTemplate` | same non-size item semantics |
| `/availability` | `IndexManagementTemplate` with search-results variant | date query is the dominant control |
| `/customers` | `IndexManagementTemplate` | future detail route/drawer |
| `/reservations` | `IndexManagementTemplate` + `WizardFormTemplate` | list/calendar plus create wizard |
| `/appointments` | `OperationalQueueTemplate` | chronological agenda |
| `/delivery-return` | `OperationalQueueTemplate` | high-risk task queue |
| `/sales` | `IndexManagementTemplate` + `RecordDetailTemplate` | ledger/return details |
| `/service` | `OperationalQueueTemplate` | state queue |
| `/stocktake` | `WizardFormTemplate`/`OperationalQueueTemplate` | finite guided session |
| `/payments` | `IndexManagementTemplate` with ledger variant | semantic financial columns |
| `/expenses` | `IndexManagementTemplate` with ledger variant | close source |
| `/daily-closing` | `ReconciliationTemplate` | no generic dashboard treatment |
| `/reports` | `ReportTemplate` | sectioned reports |
| `/inventory-performance` | `ReportTemplate` | table + selective chart |
| `/reminders` | `OperationalQueueTemplate` | due action list |
| `/waitlist` | `OperationalQueueTemplate` | status groups |
| `/audit-log` | `ReportTemplate` with `Timeline` | append-only activity |
| `/preferences` | `SettingsTemplate` + `DataSafetyTemplate` | future conceptual subroutes |
| `*` | `RecoveryTemplate` | public/private safe links |

## Template boundaries

- A template provides layout and states, never business rules.
- A feature supplies its command, field schema, domain statuses, and data loader.
- A page may compose two templates only when the user truly performs two sequential tasks, such as reservation index + create wizard.
- Public and private shells stay separate to preserve privacy, caching, and permission boundaries.
