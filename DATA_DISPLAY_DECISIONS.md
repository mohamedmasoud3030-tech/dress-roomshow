# Data Display Decisions

**Status:** VERIFIED COMPLETE (pattern decisions); route migration status is in `INTERFACE_MIGRATION_PLAN.md`.

## Global display rules

- **Cards** for visual/public browsing and independent action objects.
- **List/agenda** for chronological queues where the next action matters.
- **Table** for stable-column comparison, ledgers, audit, and reconciliation.
- **Detail/key-value** for one entity with status, identity, history, and actions.
- **Timeline/activity** for audit, reminders, service progress, and chronological appointments.
- **Chart** only for inventory-performance trend/threshold or a report whose chart answers a decision; always pair with accessible table/summary.
- All collections use canonical stable IDs/codes, not array indexes.
- A long Arabic label wraps; identifiers/phone/email/date/currency use `dir="ltr"` or bidi-safe formatting.
- Mobile does not receive a shrunken desktop table. It receives a card/list, priority columns, or a contained horizontal table with an explicit detail action.

## Route-level decisions

| Page | Primary dataset | Pattern | Hierarchy and density | Sort/filter/search | Pagination/load behavior | Selection/bulk | Row/item actions | States | Permissions/accessibility | Responsive transformation |
|---|---|---|---|---|---|---|---|---|---|---|
| `/landing` | available catalogue | visual cards + filter bar | photo/name/status/price first; size/color/code second; description last | search name/category/color/size; category/usage/new/size/sort | current client catalogue; no pagination required at 44-item scale; add load-more only if public inventory grows materially | shortlist is per item; no bulk inventory action | view piece, inquiry, booking, save, zoom | skeleton, partial warning, empty/no-results, unavailable CTA fallback | public fields only; buttons have accessible names; no hover dependency | 2-column phone card grid, 2/3 desktop; sticky WhatsApp action; filters stack/chip-scroll |
| `/piece/:code` | one public piece + similar | detail/key-value + related cards | image → identity/status → fit/price → action → description/related | related by category/type; no page-level search | single item, no pagination | save one item | appointment, inquiry, save, back | loading, not found/unavailable, error, success shortlist | status precedes CTA; code/phone/email bidi-safe | single column phone; media/details 2 columns wide |
| `/inventory` | dresses/designs | cards + list/table mode | code/state/name/photo/price; operational metadata on detail | search, category, lifecycle, rent/sale, design; sort updated/code/status | client list at current scale; if >200 add server-backed pagination/load-more with stable cursor | bulk actions not allowed until command semantics exist; print batch may be explicit | open detail, edit, images, barcode, archive, sale | loading, empty, no results, persistence failure, permission | keyboard row/card activation, no hidden actions | cards phone; dense list/table laptop/wide; detail drill-down replaces horizontal overflow |
| `/inventory/:code` | dress + related history | detail + activity list | status/action rail and code first; finance/history lower | history filter by type/status/date if needed | activity lazy-load only when scale requires | none | edit, image, barcode, archive/delete/sell | loading/not found, unavailable, validation, permission, destructive confirm | lifecycle action labels reflect business state | stacked sections phone; action rail and two columns desktop |
| `/designs/:code` | design variants + linked pieces | detail + variant matrix + list | design identity, colors/sizes/count, linked piece identity | filter linked pieces by status/size/color; sort code/updated | no pagination at current design scale; stable load-more later | no unverified bulk mutations | add variant, assign, open piece, archive | empty variants, empty links, error, confirmation | variant cells readable in RTL; linked pieces keyboard-accessible | variant chips/list phone; matrix/table wide; linked cards/list responsive |
| `/accessories` | accessories | cards + list mode | photo/name/code/status/price, notes/history lower | search/type/status/rent/sale; sort updated/name/code | current client list; add pagination only after measured growth | no bulk retirement without command | open barcode, print, retire | loading, empty/no results, error, permission/confirm | no size field for uniform items; buttons labelled | card rows phone; dense list/table desktop |
| `/availability` | date-period results | search form + result cards/list | dates/buffer/error then available item status/price; accessories separate | pickup/return/time, category, price, rent/sale; search by code/name | results bounded by date/search; no infinite scroll for decision result | no bulk select | open item, use in reservation | invalid range, no results, load/error, offline | date fields `inputMode/date`; result status announced | stacked form/results phone; 2-column form + table/list desktop |
| `/customers` | customer index | list/table on desktop, cards on phone, detail drawer/route | name/phone/status/balance/next event first; measurements/conduct only detail | text search incl digit-normalized phone; status/balance filters; sort next event/name | current client store; virtualization/pagination if measured >200 | bulk export only; no bulk delete/archive | open detail, add note, measurements, conduct, archive/delete | empty/no result/error/success/permission/confirm | phone number `dir=ltr`, row action labels; archive references | card with quick action phone; table/detail panel desktop |
| `/reservations` | reservation queue | list + calendar + detail | reservation/customer/status/dates/balance; item lines in detail | query/customer/number/status/date; sort pickup/return/status | calendar range; list can load by period; no blind infinite scroll | no bulk state mutation until audited batch command | open, edit allowed fields, payment, delivery, contract, cancel | empty/no result/conflict/error/offline/permission/confirm | wizard stepper accessible, dates/times bidi-safe | agenda cards phone; list/calendar desktop; details in sheet/route |
| `/appointments` | appointment events | chronological list/timeline | date/time/customer/status/purpose; linked record lower | date/status/customer; sort start time | day/upcoming sections, load future period on demand | none | open customer, follow-up, convert if supported | empty/no result/error | semantic `time`, focusable actions | time cards phone; grouped timeline/list desktop |
| `/delivery-return` | due operational tasks | work queue cards/list | due time/customer/item/payment gate/status first; evidence and accessories next | status/task date/customer/reservation; sort due time/risk | current due queue; period filters; no infinite scroll | no bulk delivery/return due risk | open task, photo, checklist, fee, service route | empty/no result/error/offline/permission/confirm | status announced, camera fallback, no hidden required step | one task card phone; dense queue/table desktop |
| `/sales` | sales ledger + returns | table + detail | date/sale/customer/item/net/paid/status; line details lower | text/date/payment/return filters; sort date/amount | period query; stable pagination if history grows | export only until bulk corrections modeled | invoice, print, return, detail | empty/no result/error/financial validation/confirm | money semantics readable; totals accessible | summary + expandable row phone; dense table desktop |
| `/service` | service task queue | status list/timeline | status/priority/item/task/age first; note/evidence lower | state/type/priority/date; sort priority/age | active queue first; completed history by period | no bulk complete/cancel | start/complete/cancel/open evidence | empty/no result/error/confirm | status badges text + color; keyboard state action | grouped cards phone; list/columns desktop only if accessible |
| `/stocktake` | session/findings | guided flow + grouped list | session state and scanner first; present/absent/mistakes counts then rows | manual code search; finding kind; sort code/scan time | session is finite; prior sessions by date load | no bulk delete except one mistaken scan with confirmation | scan/add/remove, complete/cancel | camera denied/manual, empty, error, confirm | input autofocus where safe, scanner fallback | full-width task controls phone; split session/history desktop |
| `/payments` | financial movement ledger | table/list + detail | date/type/amount/method/source/balance effect first | date/type/method/customer/reservation; sort date | period pagination/load-more | no bulk edit/delete; export only | add, open source, refund/adjust via command | empty/no results/error/validation/offline/confirm | labels distinguish booking advance/rental/deposit; numeric dir=ltr | summary then cards phone; table desktop |
| `/expenses` | expense ledger | table/list | date/category/amount/method/note | period/category/method; sort date/amount | period query, paginate as scale grows | export only | add/open/correct per policy | empty/no result/error | currency labels and input mode | stacked expense rows phone; table desktop |
| `/daily-closing` | reconciliation sources | summary + breakdown table | variance and close readiness first; totals by method/type; source links | business date only + source filters | one day primary; history on demand | none | drill-down/export/close | loading, incomplete source, variance/error/confirm/offline | explain liability vs revenue; close button disabled until review | summary cards + collapsible rows phone; two-column summary/table desktop |
| `/reports` | report result sets | sectioned tables, selective chart | period/filter and conclusion first; raw rows lower | report-specific filters; sort as meaning dictates | report period; exports; no arbitrary infinite scroll | export; no bulk mutation | drill-down/source link | empty/no result/error/offline | charts have table equivalent and labels | cards/summary then details phone; grid/table desktop |
| `/inventory-performance` | performance metrics by piece | sortable table + detail + trend chart | item/code/status and decision metric first; category/period lower | period/category/status; sort exception/metric | bounded period; load details on selection | export only | select row/detail/export | no data/error/partial | metric definitions, table equivalent | metric cards + detail phone; table/chart desktop |
| `/reminders` | due follow-up events | chronological action list | due date/customer/source/message status | due window/channel/status; sort due | active due first; history collapsible | no bulk send; one action at a time | open WhatsApp/dismiss/open source | empty/no results/error | honest channel status; accessible message preview | cards phone; grouped list desktop |
| `/waitlist` | demand queue | status-grouped list | customer/request/date/age/status | status/category/date/customer; sort age/date | pending first; closed history by period | no bulk convert | add/notify/convert/close | empty/no result/error/confirm | phone/contact bidi-safe | cards phone; dense list desktop |
| `/audit-log` | immutable events | timeline/activity feed; dense table optional | time/actor/action/entity/summary | action/entity/actor/date; sort chronological | server bounded log; load by period/cursor if necessary | export only | open source if allowed | empty/no result/error/offline | semantic time, `aria-live` only for new status not whole feed | vertical feed phone; table/timeline desktop |
| `/preferences` | singleton settings collections | settings sections/forms, not cards grid | section heading + consequences + fields + save state | section navigation; no collection search | no pagination; backups/copies list may paginate by count | no bulk settings change | save/reset/download/restore/account actions | reset/restore/account status with confirmation | loading/error/success/offline/permission/confirm | settings form one column phone; grouped two columns desktop |

## Pattern contracts

### List/queue

- Use explicit heading, count only when actionable, and status text.
- Primary action appears in the item; secondary actions go into an action group, not icon-only ambiguity.
- Empty state says what is missing and gives one next action.
- No-results state preserves filter values and offers clear filters.

### Cards

- A card has one identity, one status, one primary action.
- Visual image cards never hide required actions behind hover.
- On phone, controls are visible or focus-visible and are at least 44px.
- Cards do not carry a full ledger; use a detail route/sheet.

### Table

- Stable header, semantic `<table>`, sort buttons with `aria-sort`, and a mobile strategy.
- Keep identity and status columns sticky/priority; move notes/history into detail.
- Avoid horizontal scrolling unless comparison is the task and a visible label explains it.

### Detail/key-value

- Identity and lifecycle status precede all fields.
- Group fields by decision: identity, availability/lifecycle, money, history, notes.
- Primary action is state-aware; unavailable actions explain why.

### Timeline/activity

- Every event has time, actor/source, action, and a concise summary.
- Chronological direction is explicit in RTL; icons are supplementary, not the only state cue.

### Chart

- A chart must answer a named question and show period/filter context.
- Supply a table or text summary for screen readers and narrow screens.
- No 3D/decorative chart, no chart with no action interpretation.
