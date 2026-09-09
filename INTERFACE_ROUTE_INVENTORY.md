# Interface Route Inventory

**Status:** VERIFIED COMPLETE (static route/component inventory; live visual browser capture is BLOCKED BY OWNER OR EXTERNAL ACTION because this workspace has no runnable Chromium libraries).

**Repository evidence:** `src/app/router/AppRoutes.tsx`, `RootGate.tsx`, `RequireAuth.tsx`, `RequireAdmin.tsx`, `navigation.ts`, page/component sources, route/DOM tests, and the production HTML response from `https://carmengallery.vercel.app`.

## 1. Roles and permission boundaries

| Role | Entry | Allowed surface | Business responsibility | Boundary |
|---|---|---|---|---|
| زائرة عامة | `/`, `/landing`, `/piece/:code` | قراءة المعروض والملف العام، فلترة، حفظ اختيارات محلياً، فتح واتساب، خريطة، روابط القطع | اكتشاف القطع وطلب موعد/استفسار | لا حساب عميلة، لا حجز مؤكد أونلاين، لا قراءة بيانات التشغيل الخاصة |
| موظفة نشطة | `/login` ثم كل المسارات خلف `RequireAuth` ما عدا الإعدادات | التشغيل اليومي: مخزون، عميلات، حجوزات، تسليم/استرجاع، مدفوعات، خدمة، تذكيرات، تقارير | تنفيذ عمليات المعرض وتسجيل أثرها | لا إدارة حسابات/نسخ/تصفير؛ صلاحيات الخادم تظل المصدر النهائي |
| مديرة نشطة | كل ما للموظفة + `/preferences` | النسخ والاستعادة، ملف المعرض، الرسائل، الطباعة، الحسابات والصلاحيات، تصفير البيانات | الإدارة والحوكمة | `RequireAdmin` وRLS/RPC؛ العمليات الخطرة تحتاج تأكيداً ولا تُحذف السجلات التاريخية |
| جلسة غير معروفة/منتهية | أي مسار خاص | شاشة تحميل/تسجيل دخول/حالة خطأ | استعادة الجلسة | لا يُسمح بالوصول إلى البيانات التشغيلية قبل التحقق من الجلسة والـ cloud gate |

> لا يوجد دور منفصل للعميلة المسجلة في التطبيق الحالي. حساب `demo` هو حساب عرض لموظفة/مديرة حسب ملفه، وليس persona جديدة.

## 2. Shell, gates, and global states

| Surface | Current behavior | Desktop | Mobile/tablet | States and dependency |
|---|---|---|---|---|
| `RootGate` at `/` | الزائرة تُحوّل إلى `/landing`؛ الجلسة المسجلة ترى لوحة التحكم على نفس العنوان | Sidebar + `AppShell` | Bottom navigation + More sheet | `loading` يعرض `RouteLoadingFallback`؛ المسجل يمر عبر `CloudDataGate` |
| `RequireAuth` | يحفظ المسار المطلوب في `location.state` ويرسل غير المسجل إلى `/login` | لا تغيير | نفس السلوك | يحمي كل المسارات التشغيلية |
| `CloudDataGate` | لا يعرض الـ shell حتى ينجح hydrate من `showroom_state` | نفس | نفس | syncing، failure مع إعادة محاولة، commit syncing، revision conflict، offline/persistence banner |
| `AppShell` | header ثابت، تنبيه persistence، storage indicator، outlet، navigation | Sidebar يمين بعرض 72rem تقريباً، محتوى max-width | Header + bottom bar من 5 عناصر + sheet للمزيد، padding أسفل الشاشة | error/offline/local-only banner، error boundary، update notice |
| `DesktopNavigation` / `MobileNavigation` | مصدرهما `navigationGroups` نفسه | مجموعات: الرئيسية، المخزون والخدمة، العميلات والحجوزات، المبيعات والمالية، التقارير والإدارة | أربعة quick actions: الرئيسية، حجوزات، تسليم، مدفوعات + المزيد | admin-only يخفي الإعدادات في التنقل |
| `AppUpdateNotice` | banner عند وجود PWA update | أسفل يمين | أسفل فوق bottom nav | تطبيق/تأجيل، loading أثناء التحديث |
| `PersistenceErrorBoundary` | يعزل أخطاء persistence عن باقي التطبيق | banner/حالة خطأ داخل المحتوى | نفس مع قابلية القراءة | خطأ قابل لإعادة المحاولة عبر الجهة المالكة للبيانات |

## 3. Public routes

| Route / page | Roles | Purpose and primary task | Current content/actions | Data source | Current pattern | Current responsive behavior | Confirmed problems / dependencies |
|---|---|---|---|---|---|---|---|
| `/` — Front door | عامة، موظفة، مديرة | اختيار المدخل الصحيح دون إجبار الزائرة على دخول الموظفات | `RootGate` ثم boutique أو dashboard | Auth session + `CloudDataGate` للموظفة | Redirect/gate | لا محتوى ثابت قبل الحسم | صحيح سلوكياً حسب `front-door.test.mjs`; يعتمد على auth probe |
| `/landing` — البوتيك العام | زائرة عامة | تصفح المعروض واتخاذ قرار طلب موعد/استفسار | Header/nav، hero، أرقام live، categories، arrivals، search/filter/sort، cards، shortlist، Instagram، about/services، steps، FAQ، contact، footer، floating WhatsApp | anonymous public profile projection + public available catalogue | Public long-form storefront + visual cards | grid: 2 columns phone، 2/3 desktop؛ fixed mobile CTA؛ horizontal chips | الصفحة طويلة على الهاتف؛ أقسام كثيرة؛ صورة/زرين فوق البطاقة يحتاجان touch-first؛ لا حجز مؤكد أو حساب عميلة |
| `/piece/:code` — صفحة قطعة عامة | زائرة عامة | فهم قطعة واحدة ومشاركتها وطلب موعد لها | breadcrumb، photo، code/category/type، size/color، price/discount/deposit، WhatsApp appointment/inquiry، shortlist، similar pieces، unavailable state | public catalogue projection by code + public profile | Detail layout with key/value + related cards | single column phone، two-column desktop | يعتمد على public code؛ لا route server-side مستقل خارج SPA rewrite؛ حالة القطعة قد تصبح unavailable |
| `/login` — دخول الإدارة | موظفة، مديرة، زائرة تريد دخول الإدارة | إنشاء/استعادة جلسة تشغيل | email/password، دخول، نسيت كلمة المرور، retry/sign out عند auth error | Supabase Auth + profiles | Auth form | centered card، one column phone، controls 44px+ | لا تسجيل عميلة؛ external Auth/confirmed email dependency |

## 4. Authenticated operational routes

| Route / page | Roles | Primary question/task | Current content and actions | Source | Pattern | Mobile / desktop | Dependencies / confirmed issues |
|---|---|---|---|---|---|---|---|
| `/` — Dashboard | موظفة، مديرة | ما الذي يحتاج تدخلي اليوم؟ | today's deliveries/returns/late returns، balance alerts، inventory/service status، quick shortcuts، setup/support | local canonical snapshot after cloud hydrate | Operational dashboard with sections and actionable summaries | one column phone; responsive grid desktop | يجب أن يظل decision-oriented؛ لا إضافة metrics زخرفية |
| `/inventory` — DressesPage | موظفة، مديرة | ما القطع المتاحة/الحالة/الكود، وما العملية التالية؟ | search/filter، grid/list toggle، add dress/design/variants، scanner، details، edit/archive/delete/sell/print labels حسب state | dresses/designs/images/services | list/grid catalogue | grid cards phone، dense list/table-like desktop | visual cards جيدة للملابس لكن المقارنة التشغيلية تحتاج list/table mode؛ delete/archive permission risk |
| `/inventory/:code` — DressDetailsPage | موظفة، مديرة | ما الحالة الكاملة لهذه القطعة وما الإجراء المسموح؟ | identity/code/barcode، image، lifecycle، pricing/discount، reservation/sale/service history، edit/images/archive/delete/actions | dress + related reservations/sales/service | detail/key-value + history/actions | stacked sections phone؛ two-column/detail desktop | يجب عدم استخدام modal كبير لتفاصيل كاملة؛ destructive state transitions |
| `/designs/:code` — DesignDetailsPage | موظفة، مديرة | ما التصميم ومقاساته/ألوانه والقطع التابعة؟ | design identity، sizes/colors، add variants، assign piece، related pieces، archive | dress design + dress links | detail + variant collection + related list | cards/stack phone، multi-column desktop | design and physical inventory are related but not same record; immutable codes |
| `/accessories` — AccessoriesPage | موظفة، مديرة | ما الملحقات المتاحة وكيف أضيف/أطبع/أخرج قطعة؟ | search، grid/list، add، barcode scanner/card، retire/archive actions | accessories + accessory reservations | visual cards/list | card grid phone، list/grid desktop | non-dress items must not ask for size; availability/history matters |
| `/availability` — AvailabilitySearchPage | موظفة، مديرة | ما الذي يتاح للفترة المطلوبة وبأي سعر؟ | pickup/return date/time، filters/category/price، dresses result، accessories result، status and booking shortcut | availability engine + inventory/reservations | search result list/cards | filters stack phone; result cards/list desktop | date/time validation and conflict buffer are business-critical |
| `/customers` — CustomersPage | موظفة، مديرة | من العميلة وما تاريخها وما الإجراء التالي؟ | search/status/balance filters، card/list toggle، add، profile summary، measurements، conduct، archive/delete/export | customers + reservations/payments/conduct/measurements | card/list index + contextual panels | cards phone؛ list/dense desktop | delete/archive and financial references; current inline expansion risks long page |
| `/reservations` — ReservationsPage | موظفة، مديرة | ما الحجوزات القادمة وما حالة كل حجز؟ | search/status/date filters، calendar/list، create wizard، details/actions/accessories/contract | reservations + customers + inventory + payments | operational list/calendar + wizard modal | list/card phone; calendar/list desktop | current create flow is 4-step; needs persistent context and mobile-safe modal |
| `/appointments` — AppointmentsPage | موظفة، مديرة | ما مواعيد اليوم/القادمة ومن يحتاج متابعة؟ | today's and upcoming sections، add appointment، empty states | appointments + customer references | chronological list grouped by time | one-column timeline/list phone; two-column/sections desktop | should not duplicate reservations; appointment is visit planning, reservation is commitment |
| `/delivery-return` — DeliveryReturnPage | موظفة، مديرة | ما التسليمات/الاسترجاعات المستحقة وما القرار التشغيلي؟ | due filters، reservation cards، open delivery/return modal، accessory checklist، condition photos، late fees | reservations + inventory + payments + service | work queue/list with action cards | cards full-width phone; dense queue desktop | high-risk state/finance/condition workflow; must remain task-first |
| `/sales` — SalesLedgerPage | موظفة، مديرة | ما المبيعات والمرتجعات وما الذي يحتاج تسوية؟ | ledger filters/search، sale invoice, sale return, item detail/export | sales + catalogue + payments/returns | ledger table/list + detail modal/page | card summaries/contained table phone; dense table desktop | sale return must route through inspection/service; financial display semantics |
| `/service` — ServiceQueuePage | موظفة، مديرة | ما القطع التي تحتاج تنظيف/إصلاح/فحص وما الذي أنجز؟ | queue filters/status، open/start/complete/cancel task، evidence/status | service tasks + inventory + return/sale links | queue list/timeline-like state list | vertical queue cards phone; dense list desktop | chronological/status meaning; destructive cancel needs confirmation |
| `/stocktake` — StocktakePage | موظفة، مديرة | ما الموجود فعلياً وما المفقود/الغائب بعذر؟ | start session, note، scanner/manual code، expected absent/present/mistakes، complete/cancel، prior sessions | inventory + stocktake sessions + scanner | guided task flow + grouped lists | wizard/sections phone; split panels desktop | scan/manual fallback; complete/cancel destructive and audit-bound |
| `/payments` — PaymentsPage | موظفة، مديرة | ما الدفعات/الأرصدة وما المبلغ الذي أسجله الآن؟ | filter/search، payment rows/details، add payment modal، balance/ledger | payments + reservations/sales/customers | financial table/list | card rows with key totals phone; dense table desktop | booking advance, rental payment, security deposit must remain separate labels |
| `/expenses` — ExpensesPage | موظفة، مديرة | ما المصروفات وكيف أسجل/أراجعها؟ | filters/date/category، add expense، rows/export if present | expenses + daily close | ledger table/list | stacked rows phone; table desktop | financial correctness and close reconciliation |
| `/daily-closing` — DailyClosingPage | موظفة، مديرة | هل يوم اليوم متطابق نقدياً قبل الإقفال؟ | business date، cash/payment method totals، outstanding/recognized distinctions، close action/report | payments, sales, expenses, reservations, daily closing | reconciliation dashboard + table/breakdown | summary then collapsible details phone; table desktop | irreversible-ish period close; explicit review and error/retry |
| `/reports` — ReportsPage | موظفة، مديرة | ما ملخص الأداء/العمليات ضمن فترة؟ | reporting sections, filters, exports, financial/inventory summaries | report service + source collections | report sections/tables; charts only where decision useful | summary cards + drill-down phone; multi-section desktop | avoid decorative metrics; label collected/outstanding/revenue/liability clearly |
| `/inventory-performance` — InventoryPerformancePage | موظفة، مديرة | أي القطع تؤدي/تتوقف/تحتاج قراراً؟ | performance filters, trend chart, detail panel, export | inventoryPerformance service + dresses/reservations/sales | sortable table + detail panel + justified trend chart | table-to-card/detail on phone; table/chart desktop | chart must answer threshold/trend question; avoid unreadable tables |
| `/reminders` — RemindersPage | موظفة، مديرة | من يجب تذكيره الآن وبأي رسالة؟ | reminder groups, message template/use WhatsApp, dismiss | reservations/appointments/message templates | chronological action list | cards/list phone; grouped list desktop | no confirmed online booking; WhatsApp is handoff and audit/message state |
| `/waitlist` — WaitlistPage | موظفة، مديرة | من ينتظر قطعة/تاريخاً ومن أتابع؟ | pending/closed sections, filters, add, notify, convert, close | waitlist + customers + inventory availability + templates | queue list grouped by status | full-width cards phone; dense list desktop | notify/convert/close state transitions; preserving customer context |
| `/audit-log` — AuditLogPage | موظفة، مديرة | ماذا حدث ومتى ومن نفذه؟ | filter/search/export, chronological rows, empty/no-match | audit/audit-log server-authoritative collections | timeline/activity feed, not dashboard cards | event cards/timeline phone; dense timeline/table desktop | actor/time/entity/action are primary; append-only/permission boundary |
| `/preferences` — PreferencesPage | مديرة فقط | كيف أدير إعدادات المعرض والنسخ والصلاحيات بأمان؟ | backup export/import, cloud copies, snapshot/storage health, image migration, app preferences, showroom profile, message templates, print settings, account settings/management, reset data | admin commands + cloud backup + local storage + profile/preferences | settings sections with destructive/admin zones | single-column sections/accordion candidate phone; grouped two-column desktop | overloaded admin page; split by task in later safe milestone without breaking route |
| `*` — NotFoundPage | أي role داخل shell | أين ذهبت وما أقرب طريق صحيح؟ | 404, home, back to public | router location | recovery state | centered stack all sizes | route redirects must preserve old links |

## 5. Nested views, dialogs, and output surfaces

| Surface | Owning route | Role | Pattern | Current purpose | Risk |
|---|---|---|---|---|---|
| `CreateReservationModal` + `Stepper` | `/reservations` | staff/admin | 4-step wizard | customer → dates → items → summary; validates before advancing | long modal/keyboard; must preserve data on failure |
| `AddDressModal`, `AddVariantsModal`, `AddDesignModal` | inventory/design | staff/admin | Dialog/form/wizard | create physical piece/design/variants | image upload, size rules, duplicate submit |
| `EditDressModal`, `EditDressImagesModal` | inventory/detail | staff/admin | Dialog/form | edit metadata and images | mobile scroll, image persistence |
| `SellDressModal`, `CreateSaleInvoiceModal` | inventory/sales | staff/admin | financial dialog | sale/sale invoice | money, return lifecycle, print |
| `BarcodeScanner`, `BarcodeGenerator`, label printers | inventory/accessories/stocktake | staff/admin | camera + manual fallback | scan/print identity | permission denied/hardware unavailable |
| `AddAccessoryModal` | accessories | staff/admin | Dialog/form | create accessory with uniform/no size | fixed prior bug: no size for non-dress |
| `AddCustomerModal`, customer panels | customers | staff/admin | Dialog + inline detail | create customer; measurements/conduct | identity duplicate/long mobile form |
| `AddAppointmentModal` | appointments | staff/admin | Dialog/form | schedule visit | time ordering and customer link |
| `DeliveryReturnModal`, condition/photo/checklist panels | delivery-return | staff/admin | task sheet/modal | deliver/receive/inspect/service routing | financial and liability transition |
| `AddPaymentModal` | payments | staff/admin | Dialog/form | record payment by semantic type | deposit/revenue confusion |
| `AddExpenseModal` | expenses | staff/admin | Dialog/form | record expense | close/reconciliation |
| `OpenServiceTaskModal`, `CompleteServiceTaskModal`, `CancelServiceTaskModal` | service | staff/admin | Dialog/state transition | start/complete/cancel repair/cleaning | cancellation and evidence |
| `AddWaitlistModal` | waitlist | staff/admin | Dialog/form | create waiting demand | dates/items/customer |
| `QuickView` | `/landing` | public | bottom/full dialog | inspect piece and share/shortlist/inquire | touch focus/scroll; now mobile buttons visible |
| Print contract/invoice/labels | reservations/sales/inventory/accessories/reports | staff/admin | print document, not app page | physical/legal/business output | print CSS and stable snapshots |

## 6. Global state inventory

| State | Evidence / owner | Required treatment |
|---|---|---|
| Loading/skeleton | `RouteLoadingFallback`, page `loading` flags, `StateViews` | show context-specific loading; never expose blank shell for cloud hydration |
| Empty first use | `EmptyState`, dashboard setup checklist | explain why empty, one next action, no fake metrics |
| No results | page filters/search + `EmptyState` | preserve filters, offer clear filters and relevant create/ask action |
| Success | page `role=status`, feedback state | announce without moving focus unexpectedly; keep entity visible |
| Recoverable validation | RHF/Zod, `FormField`, local errors | focus first invalid control, preserve input |
| Operation error | `UserFacingErrorAlert`, persistence banner | Arabic actionable message, retry, no duplicate submission |
| Auth expired/failed | AuthContext/LoginPage | stop private reads/writes; provide retry/login, never show stale private data as current |
| Cloud hydrate failure | `CloudDataGate` | block operating shell, explain data protection, retry |
| Offline/local-only | `usePersistenceStatus`, `AppShell` | explicit status; do not imply server sync |
| Permission denied | `RequireAdmin`, server RPC/RLS | explain role boundary and safe return path |
| Partial public catalogue | `LandingPage`/repository warning | show available catalogue plus warning; contact action |
| Archived/sold/unavailable | inventory/detail/public piece | status must precede actions; no misleading booking CTA |
| Destructive confirmation | archive/delete/reset/cancel/close | explicit consequence, role check, auditable command, rollback path where supported |

## 7. Evidence limits

- Repository and jsdom route/contract tests were inspectable.
- Production HTML and headers were reachable; the production build was observed separately from current `main` in the previous session.
- Real pixel inspection, touch/keyboard/browser console, camera, print preview, and PWA install remain **BLOCKED BY OWNER OR EXTERNAL ACTION** until a browser-capable/device session is available. No visual pass is claimed here.
