# Form Component Standard

**Status:** VERIFIED COMPLETE as the form contract; implementation is staged in `INTERFACE_MIGRATION_PLAN.md`.

## Non-negotiable form rules

1. كل form يوضح ما الذي سيتم حفظه وأين سيظهر.
2. label مرئي ومربوط بالتحكم؛ placeholder ليس label.
3. الحقول ذات العلاقة في مجموعات صغيرة: هوية، فترة، قطع، مال، ملاحظات.
4. `required` يعبر عن قاعدة domain، لا مجرد رغبة UI.
5. validation في client للسرعة وفي command/service/server للثقة.
6. الخطأ inline تحت الحقل، والخطأ cross-field في summary، و`role=alert` للخطأ.
7. أول حقل خطأ يأخذ focus؛ المدخلات لا تمسح بعد error/timeout/offline.
8. كل submit يمنع double-submit ويعرض busy label؛ idempotency key للعمليات الحساسة.
9. الهاتف: controls 16px+، min-height 44px، `inputMode` وautocomplete صحيحان، الأزرار فوق safe area ولا تختبئ خلف keyboard.
10. money/phone/code/date لها bidi/formatting مناسب: money format مركزي، phone/email/code `dir=ltr`، التاريخ والوقت محليان بوضوح.
11. لا success toast وحده؛ status يبقى في الصفحة ويؤكد ما تم حفظه.
12. cancel لا يمسح draft خارج تأكيد الخروج عند وجود مدخلات غير محفوظة.

## Canonical field primitives

| Primitive | Use | Required behavior |
|---|---|---|
| `FormField` | label/hint/error shell | generated id, `aria-describedby`, `aria-invalid`, required marker |
| `TextField` | name/code/phone/email/notes short | `autocomplete`, input mode, `dir` by semantic type |
| `MoneyField` | prices, payments, expenses, fees | `inputMode=decimal`, unit `ر.ع.` visible, non-negative/precision validation |
| `SelectField` | small fixed option set | native select, explicit empty option only when optional |
| `SearchableSelect` | customers, inventory, designs, large lists | filter, highlighted selected, unavailable/empty copy, keyboard listbox |
| `TextAreaField` | description/notes/terms | min height, preserve content, char guidance if needed |
| `DateTimeControls` | pickup/return/appointments/availability/waitlist | separate labels, local timezone, range validation, no hidden default |
| `FileUpload` | item/condition images | preview, type/size guard, retry/remove, partial result retention |
| `FormActions` | all create/edit dialogs | primary submit, secondary cancel, busy/disabled, mobile stacking |
| `ValidationSummary` | wizard/long preference forms | links to invalid fields, only shown when validation runs |

## Standard layout

```text
Form title + outcome hint
[ValidationSummary if needed]
Group: identity / selection
Group: dates and time
Group: money/status (only if relevant)
Group: notes/evidence
FormActions
```

- Desktop: 2 columns only when fields are independently scannable; related controls stay together.
- Tablet: 2 columns for simple fields, 1 column for cross-field blocks.
- Phone: 1 column; no two controls side by side if labels/units compete.
- Long forms use a sticky-but-non-covering action bar only after testing keyboard/validation; otherwise bottom actions in the scroll container.

## Form inventory and standardization decisions

| Form | Necessary fields and order | Control types/format | Validation and failure | Submit/keyboard/mobile | Command/persistence |
|---|---|---|---|---|---|
| Login | email → password → submit; reset below | email/password, autocomplete email/current-password | empty/invalid/auth error; retain email, never expose whether account exists beyond approved copy | full-width on phone; Enter submits; 16px | Supabase Auth; session/profile gate |
| Add customer | name → phone → address/notes optional | text, tel `dir=ltr`, textarea | name required; phone normalized/min 7/no duplicate; preserve on error | primary bottom; focus first error | `customer.create`, audit, rollback |
| Customer measurements | relevant body measures → unit/notes | number/decimal with units + structured model | partial measurements show what is missing, never guess size; preserve legacy text | grouped by body area; phone one column | customer measurement service/command |
| Conduct note | note/action and optional history context | textarea + explicit save | non-empty, no silent overwrite | compact sheet action visible | append note/command/audit |
| Add/edit dress | name/category/type → size/color if applicable → rent/sale flags/prices/discount/deposit → description/images | select/search, text, money, percentage, image upload | size required only for dress/shoe/veil; uniform for others; at least one valid sale/rent price; discount bounded; image guard | step/group on phone; image upload has retry | inventory command + image sync + audit |
| Design | design name/category → colors/sizes/description | text, multi-value chips or controlled fields | unique design code/server allocated; no orphan variant; errors preserve entered variants | variant creation should show count/summary | design command; physical pieces keep independent IDs |
| Add variants | design context → matrix of size/color/price/service values | repeated rows with combobox/chips + money | unique each combination; clear duplicate row; avoid giant unbounded matrix on phone | phone uses repeatable rows; desktop matrix | variant/design commands, codes/barcodes allocated |
| Add accessory | name/type → rent/sale/discount/deposit → notes/image | text/select/money/percentage | no size requirement; uniform display; price rules; duplicate identity | same FormActions; no hidden size field | accessory command + images |
| Create reservation wizard | 1 customer → 2 pickup/return → 3 line items/accessories → 4 summary/payment | `SearchableSelect`, `DateTimeControls`, item selector, money summary | validate each step before next; return > pickup; conflicts; required upfront/explicit override; at least one line; preserve state going back | `Stepper` 44px, previous/next, keyboard; dialog scroll touch-safe | reservation command atomic/idempotent; audit/finance/inventory effects |
| Appointment | customer → date/time → purpose/note | search select, date/time, textarea | end > start, valid customer/time, no impossible duration | simple one-column phone | appointment command/audit |
| Availability query | pickup/return + optional time → category/usage/max price | date/time, select, money | range/buffer; no mutation; clear results | search is explicit, not autosubmit if it causes reflow | availability read model |
| Delivery/return | reservation/item context → payment gate → checklist/photos/condition → fees/decision | read-only summary + checklist + file upload + money/reason select | cannot deliver without configured amount unless explicit audited override; return routes to inspection/service; fee/deposit semantic | action bar at bottom of sheet; photos progress and retry | delivery/return command atomic with finance/audit |
| Payment | source → semantic type → amount → method/date/note | source readonly/search, radio/select, money, date | amount >0, cannot exceed applicable rules; booking advance vs rental vs deposit distinct; duplicate key | keyboard numeric, total/current balance visible | payment command/finance/audit |
| Sale/invoice | customer optional/required per policy → item lines → discount per piece → payment → print | line list, money, payment method | immutable item code; per-piece discount, totals reconcile; no negative | summary remains visible; print after success, not before commit | sale command, invoice, finance, audit |
| Expense | date → category → amount/method → note | date/select/money/select/textarea | amount >0, valid date/method; preserve on error | simple bottom actions | expense command/daily close/audit |
| Service open/complete/cancel | item/task type/notes → evidence → decision | select/textarea/file upload; cancel reason | valid lifecycle; complete evidence if required; cancel reason | no destructive icon-only action | service commands/audit/inventory transition |
| Stocktake start | note optional → start | textarea/button | no hidden exclusion; session idempotency | action obvious on phone | stocktake command |
| Stocktake scan | code/barcode → scan/manual fallback | text `dir=ltr`, camera | unknown/duplicate/mistaken scan messages; remove only one scan | autofocus only if it does not fight camera; manual fallback | stocktake session persistence |
| Stocktake complete/cancel | findings review → confirm action | summary + confirm | incomplete/variance surfaced; cancel reason/confirmation | two distinct buttons, destructive separated | stocktake command/report/audit |
| Waitlist | customer → desired category/item/date → notes | search, date, select, textarea | customer/date required; no availability claim; preserve | one-column phone | waitlist command/message context |
| Profile editor | brand → public copy → phone/WhatsApp/email/Instagram/hours → address/map | text/textarea/email/tel, address lines | brand required; contact formatting; country-only address allowed; map query separate | grouped settings section; save status | `profile.save`, audit, cloud command |
| Message templates | channel/event template text | textarea/preview | variables validated, no unapproved claims | preview next to/below field | templates command/audit |
| Print settings | paper/margins/font/sections | select/number/checkbox | clamp safe margins; print preview/standard defaults | settings save visible | print settings command |
| Backup import | file → confirm replacement | file upload + explicit confirmation | size/schema/application/version/integrity validation; no replacement before validation | destructive warning includes scope; busy/retry | `database.import`, exact rollback, cloud authority |
| Reset data | explicit phrase/confirmation → reset | confirm dialog, not a visible casual button | admin only; backup warning; exact reset command; no partial reset | destructive action isolated at bottom | `database.reset`, audit/cloud RPC |
| Account management | account row role/active state | select/switch with confirm where needed | admin cannot accidentally remove own access; server checks | row actions named; no hidden toggle meaning | profiles RLS/admin update |

## Validation message rules

- Use domain language: «تاريخ الإرجاع يجب أن يكون بعد الاستلام»، not generic «قيمة غير صحيحة».
- Explain correction: «اكتبي المقاس أو اختاري موحداً لهذا النوع».
- Financial error explains what did not move: «لم تُسجل أي حركة مالية».
- Network/timeout says retry safety: «أعيدي المحاولة بأمان؛ لن تتكرر العملية نفسها» only when idempotency guarantees it.
- Permission error explains role and return path, never leaks private data.

## Unsaved/error/offline behavior

- Draft state lives in component while dialog remains open; close confirms discard when dirty.
- Recoverable server failure leaves values and focus; no automatic reset.
- Cloud commit pending disables duplicate submit, but the form still shows a visible saving state; navigation must not silently lose draft.
- Offline/local-only status is explicit. Financial/authority operations do not claim success before cloud commit.
- Expired session stops submit, explains re-login, and preserves draft only when it is safe and non-sensitive.

## Form test requirements

For every migrated form, add the minimum relevant tests:

- render labels and accessible names;
- required/invalid/cross-field validation;
- first-invalid focus or validation summary;
- input retention after recoverable error;
- busy/double-submit/idempotency;
- mobile modal/keyboard touch scroll;
- command result, audit, rollback, and cloud failure where the form mutates business data;
- role/permission denial for admin/destructive actions.
