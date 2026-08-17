# التدقيق الاستباقي للصحة الوظيفية وقواعد الأعمال — LENA

> تاريخ التدقيق: 2026-08-17
>
> النطاق: التطبيق كاملًا، routes، roles، services، workflows، snapshot database، migrations، الاختبارات، PWA والـ public landing.
>
> هذا المستند يسجل baseline read-only قبل الإصلاحات الوظيفية اللاحقة. حالة الإصلاح الفعلية والأدلة الحالية موثقة في `PROJECT_DEFECTS.md`. لم تُطبق migrations أو عمليات production.

## 1. الخلاصة التنفيذية

التطبيق يحتوي تغطية واسعة لقواعد الحجز والمال والمخزون، ونجحت بوابة baseline قبل الإصلاحات: **682/682 test** مع نجاح typecheck وESLint وproduction build. النتائج الحالية بعد الإصلاح موثقة في `PROJECT_DEFECTS.md` (**698/698**). لكن الفحص التشغيلي المباشر كشف عيوبًا لا تراها هذه الاختبارات، وبعض الاختبارات الحالية تثبت implementation غير آمن بدل أن تتحقق من النتيجة التجارية النهائية.

أهم العيوب المخفية:

1. إرجاع الفستان مع إرجاع جزء من الملحقات يغلق الحجز كاملًا، ويبقي ملحقًا خارج المحل ثم يخفيه من عداد dashboard.
2. الحجز الذي انتهت مدته ولم يُسلّم يتحول إلى `overdue` ثم لا يمكن تسليمه أو إلغاؤه أو إرجاعه؛ القطعة تبقى محجوزة بلا مسار إنهاء.
3. دفعة الحجز المحصلة لا يمكن ردها، وفي الوقت نفسه تمنع إلغاء الحجز؛ لا يوجد مسار تسوية cancellation.
4. service conflict يفحص القطعة الأولى فقط في الحجز متعدد البنود؛ يمكن إدخال القطعة الثانية للصيانة فوق حجز قادم.
5. إعدادات هوية وصفحة المعرض التي يعدلها admin لا تصل إلى الزائرة العامة على جهاز آخر؛ public page تعرض hardcoded contact/profile من bundle.
6. حقل “نطاق الجرد” مجرد وصف؛ تقرير الجرد يحاسب كل المخزون، فيبلغ أن باقي الرفوف مفقودة.
7. المواعيد المستقبلية تُحفظ لكن لا توجد شاشة تعرضها؛ وبعد الإنشاء تظهر مؤقتًا تحت “مواعيد اليوم” حتى refresh.

أخطر تناقض بيانات/قواعد عمل هو **إغلاق الحجز مع ملحق ما زال خارج المحل**: الاختبار نفسه يثبت بقاء الملحق outstanding، لكن dashboard/reminders يستبعدان الحجز بعد انتقاله إلى `returned`. هذه حالة يمكن أن تؤدي إلى فقد أصل فعلي دون متابعة تشغيلية.

### قرار الجاهزية

**لا أوصي بتوسيع الاستخدام أو اعتبار قواعد العمل مكتملة قبل إصلاح Milestone 1 في آخر التقرير.** لا يعني ذلك أن كل النظام مكسور؛ المبيعات الأساسية، الفصل بين الإيجار والتأمين، conflict للحجوزات المعتادة، rollback المحلي، والجرد الكامل بلا scope لها اختبارات مفيدة. المشكلة أن حالات حدودية واقعية في يوم العمل ما زالت بلا مسار سليم.

## 2. مصادر الأدلة وطريقة الفحص

تمت مراجعة:

- كل routes في `src/app/router/AppRoutes.tsx` والتنقل والأدوار.
- services/workflows لكل inventory, customers, reservations, accessories, delivery/return, payments, sales, expenses, appointments, waitlist, service, stocktake, reports, reminders, preferences وauth.
- `showroom_state` RPC وRLS والمigrations 0001–0018.
- 70 ملفًا تحت `tests/`، منها 68 test/spec files، مع مراجعة E2E mocks وطبيعة assertions.
- public landing data/profile sources.
- full build وPWA output.

### الفحوص المنفذة

```text
npm test                                      PASS — 682/682
npm run typecheck                             PASS
npm run lint                                  PASS
npm run build                                 PASS — 2217 modules
npm audit --omit=dev                          PASS — 0 vulnerabilities
npm audit                                     PASS — 0 vulnerabilities
production preview smoke                      PASS
/ /login /landing /reservations               HTTP 200 SPA shell
/manifest.webmanifest                         HTTP 200
/sw.js                                        HTTP 200
```

تم تشغيل checks على default Node `22.23.2` عبر بيئة مؤقتة. Playwright browser journeys لم تبدأ لأن Chromium binary غير متاح في sandbox؛ لذلك لا أدعي visual/browser behavior لم أشاهده.

### سيناريوهات تشخيصية مباشرة

تم تشغيل services الفعلية في storage معزول، دون تعديل المستودع. النتائج:

```text
STOCKTAKE_SCOPE
scope="رف الزفاف", scanned D-001, missing=[D-002 from another shelf]

NO_SHOW_STATUS
confirmed + past dates + never delivered => overdue
cancel => rejected
complete delivery => rejected

SERVICE_SECONDARY_CONFLICT
multi-item top-level=D-001, secondary=D-002
blockers(D-002)=[]
service task opened successfully over booked secondary item

ADD_LINE_AUDIT
before=4, after=4, delta=0

PARTIAL_ACCESSORY_RETURN
reservationStatus=returned, outstandingAccessories=1, dashboardOut=0

ADVANCE_CANCEL
cancel => rejected because paidAmount > 0
refund => rejected because no rental collection exists

FUTURE_APPOINTMENT
saved=2026-08-22, todayList=0
```

## 3. Feature-status matrix

المصطلحات:

- **Verified Working:** behavior نفذته tests ذات معنى أو scenario مباشر.
- **Confirmed Defect:** failure قابل لإعادة الإنتاج أو تناقض مباشر.
- **Incomplete:** capability ناقصة أو backend بلا UI.
- **Unverified:** يحتاج provider/device/live backend.
- **Contradictory:** أكثر من مصدر حقيقة أو تعريف غير متفق.

| المجال / الرحلة | الحالة | الأدلة والحكم |
| --- | --- | --- |
| Public `/landing` inventory | Verified Working جزئيًا | يقرأ `catalogue_items` العام ويعرض available؛ E2E mocked وrepository tests تمر. Live Supabase غير متحقق. |
| Public showroom profile/contact | **Confirmed Defect** | profile يُقرأ من localStorage فقط؛ public visitor لا يمر بـ CloudDataGate ولا يستطيع قراءة private snapshot. |
| Login/session guards | Verified Working محليًا / Unverified live | model وroutes وRLS text tests تعمل؛ Auth provider الحي غير متحقق. |
| Account provisioning/activation | **Incomplete** | أول حساب admin active؛ الحسابات التالية inactive، ولا admin UI للتفعيل/الدور/reset. |
| Role navigation | Verified Working جزئيًا | settings/reopen/delete UI admin-only بعد الإصلاح السابق؛ server behavior live غير متحقق. |
| Inventory create/code/archive/delete | Verified Working جزئيًا | monotonic codes وarchive blockers وatomic commands مختبرة. |
| Inventory edit/restore | **Incomplete** | update/restore services موجودة، لكن لا UI عام لتعديل الاسم/السعر/الحالة أو restore archived item. |
| Designs/variants | Verified Working | creation/link/variants/availability/performance لها tests واسعة. Edit metadata UI محدود. |
| Dedicated accessories catalogue | Verified Working جزئيًا | lifecycle والباركود والربط مختبرة؛ الإغلاق مع partial return معيب. |
| Generic inventory `itemType=accessory` | **Contradictory** | يوجد نظام ملحقات ثانٍ منفصل؛ public projection يعرض generic items فقط لا dedicated accessories. |
| Customers create/search/archive/delete | Verified Working جزئيًا | duplicate phone والhistory blockers مختبرة. |
| Customers edit/restore | **Incomplete** | `updateCustomerCommand` موجود بلا UI لتعديل identity/contact/status؛ archived customer لا restore path. |
| Measurements/conduct | Verified Working | derived conduct وmeasurements/printing مختبرة. |
| Availability search | Verified Working محليًا | central conflict rule والبدائل مختبرة؛ live concurrent devices غير متحقق. |
| Reservation create multi-item | Verified Working جزئيًا | normal creation/conflicts/payments tested؛ top-level financial semantics contradictory بعد line changes. |
| Reservation reschedule | **Confirmed Defect** | secondary service conflict منفصل؛ reschedule نفسه لا يمنع pickupDate الماضي، على خلاف create/update-line. |
| Reservation cancellation | **Confirmed Defect** | no-show trap وbooking-advance cancellation dead end. |
| Add/update/remove contract line | **Confirmed Defect جزئيًا** | add line يغير قيمة العقد بلا audit؛ update/remove audit موجودان. |
| Whole delivery | Verified Working جزئيًا | payment gate/override/item status/rollback tested؛ undelivered attached accessories قد تبقى reserved بعد close. |
| Whole return | **Confirmed Defect** | يسمح partial accessory return ثم يغلق reservation. |
| Per-line delivery/return | Verified Working جزئيًا | payment gate، status، settlement، inspection invariants tested. |
| Payments/refunds/deposits | Verified Working للسيناريوهات المدعومة | الفصل المالي واختبارات over-refund/idempotency قوية؛ booking advance refund غير مدعوم. |
| Sales invoices/line returns | Verified Working محليًا | saleability, invoice, duplicate return, inspection, finance reports tested. |
| Expenses | Verified Working للإنشاء | positive amount/date/open-day/item refs. Append-only intent؛ لا correction UI. |
| Daily closing/reopen | Verified Working محليًا / Unverified server | calculations وblocking مختبرة؛ staff/server behavior يحتاج PostgreSQL integration. |
| Reports/finance | Verified Working للسيناريوهات المختبرة | canonical totals/reconciliation tested؛ data integrity تعتمد على client snapshot validation. |
| Dashboard | **Confirmed Defect جزئيًا** | يختفي outstanding accessory بعد reservation returned. المال outstanding ما زال يظهر. |
| Reminders | **Confirmed Defect جزئيًا** | returned reservation ذات رصيد لا تدخل reminders رغم تعليق الكود أنها الحالة الأهم. |
| Appointments | **Confirmed Defect / Incomplete** | future appointments لا شاشة لها؛ status update/delete backend بلا usable UI، وdelete بلا audit. |
| Waitlist | **Incomplete** | notify/close موجودان؛ “إنشاء الحجز” لا يحمل entry context ولا يستدعي `markWaitlistConverted`. |
| Service queue | **Confirmed Defect جزئيًا** | secondary multi-line conflicts لا تُرى؛ cancellation backend لا يعيد item state، ولا cancel UI. |
| Stocktake full showroom | Verified Working | duplicate scan/no auto-mutation/classification/backup tested. |
| Stocktake scoped shelf | **Confirmed Defect** | scope لا يفلتر expected inventory. |
| Audit log | **Confirmed Defect** | migration 0017 أزالت append-only protection للـ staff؛ بعض operations أيضًا بلا audit. |
| Backup/import/reset | Verified Working محليًا | rollback/coverage/images tested؛ server/PITR/restore production غير متحقق. |
| Cloud synchronization | **Confirmed Defect جزئيًا** | stale descendant queue أصلح؛ caller ما زال يرى local success قبل server acknowledgment. |
| PWA | Verified build / Unverified device | manifest/SW/offline shell built؛ install/update/private-cache on device غير متحقق. |
| Tauri | Unverified/out of scope | code retained، official ADR يستبعده. |

## 4. سجل العيوب الوظيفية المؤكدة

### FC-01 — إغلاق الحجز مع ملحق لا يزال خارج المحل

- **الشدة:** High.
- **المستخدمة/البيانات:** موظفات التسليم، inventory accessory، customer history، dashboard.
- **إعادة الإنتاج:** اربط ملحقين، سلّمهما، ثم في `completeReturnCommand` أرجع واحدًا فقط. النتيجة المباشرة:

  ```text
  reservationStatus=returned
  getOutstandingAccessories(...).length=1
  dashboard.accessoriesOutCount=0
  ```

- **الدليل:** `completeReturn` يدعم `accessoryReturns` جزئية، يحسب `stillOut`, لكنه ينفذ `updateReservationFulfillment(..., 'return')` دائمًا. dashboard يجمع outstanding accessories من active reservations فقط؛ `returned` ليست active.
- **السبب المرجح:** partial accessory state صُمم داخل link service دون ربطه بحالة إغلاق العقد والمتابعة اليومية.
- **الأثر:** ملحق فعلي يبقى مع العميلة دون أن يظهر في board/reminders. هذا خطر فقد أصل.
- **أصغر إصلاح موصى به:** لا تغلق whole reservation طالما `stillOut.length>0`، أو أنشئ status/queue مستقل “ملحقات معلقة” يظهر بعد إغلاق الفستان. كذلك حرر attached accessories التي لم تُسلّم قط عند إغلاق العقد.
- **الحالات الحدية:** ملحق lost/damaged، undelivered reserved accessory، عدة partial returns، return retry، deposit/charge مرتبط بالملحق.
- **Regression tests:** عدّل الاختبار الحالي الذي يثبت outstanding ليؤكد أيضًا أن dashboard/follow-up يبقى ظاهرًا وأن undelivered reserved links تُحرر.
- **التحقق:** journey كاملة delivery→partial return→dashboard→final accessory return→dashboard zero.

### FC-02 — no-show reservation يدخل حالة بلا مخرج

- **الشدة:** High.
- **المستخدمة/البيانات:** موظفات الحجوزات، القطعة المحجوزة، availability، customer conduct.
- **إعادة الإنتاج:** حجز `confirmed` لم يُسلّم، مرّ `returnDate`. `getReservations()` يحوله إلى `overdue`. بعدها:
  - cancellation مرفوض لأن `overdue`؛
  - delivery مرفوض لأن ليس pending/confirmed؛
  - whole return مرفوض لأن line ما زال `pending_delivery`.
- **الدليل:** `hydrateOverdueStatus` fallback يحول pending/confirmed بناءً على top-level return date حتى دون delivery. `assertReservationCanBeCancelled` يمنع overdue.
- **الأثر:** الحجز والقطعة يظلان active/conflicting للأبد، ولا يوجد no-show close UI.
- **السبب:** نفس status `overdue` استُخدم لـ “قطعة مسلّمة متأخرة” و“موعد انتهى ولم تحضر العميلة”.
- **أصغر إصلاح:** لا تجعل non-delivered line `overdue_return`. أضف derived `no_show` أو action صريح “إغلاق كعدم حضور/إلغاء بعد انتهاء الفترة” مع policy وأثر مالي واضح.
- **الحالات الحدية:** booking advance موجود، deposit موجود، partial delivery، اليوم نفسه، timezone، waitlist release.
- **Regression tests:** passage-of-time test بلا direct status edit، ثم no-show close يحرر availability ويحفظ conduct/audit ولا يمس مالًا دون policy.
- **التحقق:** reservation disappears from active conflicts، item remains correct physical state، waitlist opportunity appears.

### FC-03 — لا يمكن إلغاء حجز بعد تحصيل دفعة الحجز ولا ردها

- **الشدة:** High.
- **المستخدمة/البيانات:** cashier، customer balance، cancellation، finance ledger.
- **إعادة الإنتاج:** اجمع `booking_advance=5`. `cancelReservation` يرفض بسبب `paidAmount>0`. `refund` يرفض لأن guard يسمح برد rental collection فقط. لا يوجد `booking_advance_refund` type/path.
- **الدليل:** code وtest باسم `booking-advance cancellation refund is deliberately outside this PR` يقران أن المسار غير منفذ.
- **الأثر:** عقد لا يمكن إلغاؤه ضمن التطبيق، حتى لو قرر المالك رد الدفعة أو احتجازها حسب السياسة.
- **السبب:** تم فصل المعنى المالي بشكل صحيح، لكن cancellation settlement لم يكتمل.
- **أصغر إصلاح:** قرار product أولًا: هل الدفعة غير مستردة دائمًا، قابلة للاسترداد بسبب، أم جزئيًا؟ ثم command واحدة تسجل policy decision، refund/retention movement، cancellation وaudit ذريًا.
- **الحالات الحدية:** عدة دفعات، رد جزئي، يومية مقفلة، multi-item، idempotent retry، legacy ambiguous deposit.
- **Regression tests:** كل policy outcome + daily close + finance totals + duplicate retry + forced failure.
- **التحقق:** cancellation closes reservation، ledger reconciles، item/waitlist released، reports agree.

### FC-04 — service conflict لا يفحص القطع الثانوية في الحجز

- **الشدة:** High.
- **المستخدمة/البيانات:** service staff، inventory readiness، upcoming customer booking.
- **إعادة الإنتاج:** أنشئ contract به D-001 وD-002. `getServiceConflictBlockers(D-002, overlapping dates)` يعيد `[]` لأن `reservation.dressCode` هو D-001. `openServiceTask` على D-002 ينجح.
- **الدليل:** filter داخل `getServiceConflictBlockers` يقارن `reservation.dressCode === dressCode` ولا يقرأ `getReservationLines`.
- **الأثر:** قطعة محجوزة يمكن أن تدخل صيانة/غسيل خلال فترة التجهيز أو الحجز.
- **السبب:** service بقي على نموذج single-item بعد إضافة contract lines.
- **أصغر إصلاح:** استخدم كل line matching code/ID وتواريخ line الخاصة، لا top-level فقط.
- **الحالات الحدية:** per-line dates مختلفة، partial return، archived/sold، buffers قبل وبعد، reschedule.
- **Regression tests:** secondary line، third line، different dates، no false blocker لخط آخر.
- **التحقق:** UI preview وservice command كلاهما يعرضان نفس blocker ويرفضان write.

### FC-05 — تخصيص الصفحة العامة لا يصل للجمهور

- **الشدة:** High.
- **المستخدمة/البيانات:** owner/admin والزائرات؛ contact/WhatsApp/email/address.
- **إعادة الإنتاج/الدليل:** admin يحفظ `showroom-profile` داخل private showroom snapshot/local cache. `/landing` خارج `RequireAuth/CloudDataGate` ويستدعي `getShowroomProfile()` من localStorage. جهاز زائرة جديد لا يملك هذه collection، فيستخدم `landingShowroomProfile` hardcoded.
- **الأثر:** المالك يرى تعديلاته في متصفحه، لكن الجمهور يرى أرقامًا وبريدًا وعنوانًا hardcoded في bundle. قد يتواصل العملاء مع جهة خاطئة.
- **السبب:** inventory حصل على public projection (`catalogue_items`) لكن showroom profile لم يحصل على public projection/API.
- **أصغر إصلاح:** public `showroom_public_profile` row أو edge/static config projection بfields معتمدة فقط وRLS anon read؛ landing يجلبه مثل catalogue ويستخدم static fallback فقط عند unconfigured dev.
- **الحالات الحدية:** provider failure، partial profile، unsafe URLs، empty phone، cache/update، privacy fields لا يجب نشرها.
- **Regression tests:** anonymous browser on empty storage receives changed public profile؛ private preferences لا تظهر.
- **التحقق:** جهاز/clean context مختلف عن admin يعرض نفس approved contact data.

### FC-06 — نطاق الجرد لا يغير نطاق التقرير

- **الشدة:** High.
- **المستخدمة/البيانات:** inventory count والقرارات حول القطع المفقودة.
- **إعادة الإنتاج:** ابدأ scope “رف الزفاف”، امسح قطعة ذلك الرف فقط، أغلق/اعرض report. قطعة “رف السهرة” تظهر missing.
- **الدليل:** `scope` string يُخزن ويعرض فقط؛ `buildStocktakeReport` يمر على كل `getDresses()` وكل `getAccessories()` دون filter.
- **الأثر:** جرد جزئي مشروع ينتج بلاغ فقدان كاذب لكل بقية المعرض.
- **السبب:** UI قدمت free-text scope دون model membership/query.
- **أصغر إصلاح:** إما إزالة ادعاء scope وجعل الجلسة “المعرض كاملًا”، أو تحويل scope إلى filter محدد قابل لإعادة الإنتاج (category/location/item IDs snapshot).
- **الحالات الحدية:** item ينتقل بين رفوف، accessories، archived/sold/out-on-rental، empty scope.
- **Regression tests:** scoped set فقط يدخل denominator/missing؛ full scope يبقى كما هو؛ scope definition محفوظ بالbackup.
- **التحقق:** جرد رف واحد لا يذكر رفًا آخر.

### FC-07 — المواعيد المستقبلية محفوظة لكن غير قابلة للاستخدام

- **الشدة:** Medium.
- **المستخدمة/البيانات:** front desk، future appointments.
- **إعادة الإنتاج:** أضف موعدًا بعد 5 أيام. service يحفظه، `getTodaysAppointments()` يعيد صفر. الصفحة لا تستدعي query أخرى. `handleAppointmentCreated` يضيف أي موعد جديد مؤقتًا إلى state المسمى today، فيظهر تحت “مواعيد اليوم” حتى refresh ثم يختفي.
- **الدليل:** `AppointmentsPage` تعرض `getTodaysAppointments` فقط. لا calendar/list/filter. Backend status update/delete بلا controls.
- **الأثر:** لا يمكن مراجعة أو إدارة موعد غدٍ قبل يومه، والواجهة تعرضه في قسم خاطئ مباشرة بعد الإنشاء.
- **السبب:** create modal توسع إلى future dates بينما page بقي dashboard لليوم فقط.
- **أصغر إصلاح:** list قادم مرتبة بالتاريخ + today section؛ لا append لموعد غير اليوم؛ status actions مدققة.
- **الحالات الحدية:** room conflicts، cancelled/completed، timezone/day rollover، past appointment history.
- **Regression tests:** create future not in today but in upcoming؛ refresh consistency؛ status transition/audit.
- **التحقق:** نفس النتائج قبل وبعد refresh/navigation.

### FC-08 — إضافة بند للعقد بلا audit

- **الشدة:** Medium.
- **المستخدمة/البيانات:** العقد، السعر، المخزون، audit trail.
- **إعادة الإنتاج:** audit count قبل وبعد `addContractLine` لا يتغير (`delta=0`).
- **الدليل:** `addContractLine` يبني line ويستدعي persist فقط. `removeContractLine` و`updateContractLine` يسجلان audit.
- **الأثر:** تتغير قيمة العقد وعدد القطع دون تاريخ يوضح من أضاف القطعة ومتى.
- **السبب:** capability أضيفت بعد command/audit contract ولم يكتمل audit call.
- **أصغر إصلاح:** audit داخل نفس command boundary بقيم line code/dates/rental/deposit والعدد قبل/بعد.
- **الحالات الحدية:** forced audit failure يجب rollback line، idempotent duplicate، paid contract يجب تحديد هل الإضافة مسموحة.
- **Regression tests:** audit success + forced failure exact rollback.
- **التحقق:** audit UI/CSV يظهر إضافة البند مرة واحدة.

### FC-09 — returned reservation ذات رصيد لا تنتج reminder

- **الشدة:** Medium.
- **المستخدمة/البيانات:** collection staff، customer debt.
- **الدليل:** `getReminders` يبدأ بتصفية statuses إلى pending/confirmed/delivered/overdue، ثم يقول التعليق إن money owed on finished rental هو urgent. `returned` أزيل قبل outstanding check. `getOutstandingRentalBalances` لا يزيل returned، لذلك dashboard وreminders يختلفان.
- **الأثر:** الدين يظهر في dashboard لكن لا يدخل workflow واتساب/تذكير اليومي.
- **السبب:** active operational filter أُعيد استخدامه خطأ لتذكير مالي مستقل عن وجود القطعة خارج المحل.
- **أصغر إصلاح:** derive outstanding reminder من كل non-cancelled reservation ذات remaining >0، مع urgency أعلى للـ returned/past due.
- **الحالات الحدية:** rental refund، reopened day، cancelled with retained advance policy، zero rounding.
- **Regression tests:** returned unpaid appears؛ returned paid absent؛ no duplicate with overdue reminder.
- **التحقق:** dashboard count وreminder amount reconcile.

### FC-10 — “تحوّل لحجز” في waitlist لا يوجد له مسار مستخدم

- **الشدة:** Medium.
- **المستخدمة/البيانات:** booking staff، waitlist fairness/history.
- **الدليل:** service يحتوي `markWaitlistConverted`, لكن لا workflow export/caller. زر “إنشاء الحجز” يذهب إلى `/reservations?new=1` دون customer/item/dates/waitlist ID، ولا يحدث entry بعد نجاح الحجز.
- **الأثر:** الطلب يبقى waiting/notified، summary converted غير دقيق، وقد يُتصل بالعميلة مرة أخرى.
- **السبب:** navigation handoff لم يربط transaction completion بالـ waitlist record.
- **أصغر إصلاح:** pass safe prefill + waitlist ID، وبعد create reservation نفذ conversion داخل command ذري أو command تابع acknowledged.
- **الحالات الحدية:** قطعة أعيد حجزها قبل submit، user cancels form، alternative sibling code، duplicate click.
- **Regression tests:** successful conversion links reservation؛ failed booking leaves waiting؛ no arbitrary reservation number.
- **التحقق:** entry status/summary/audit/reservation كلها متوافقة.

### FC-11 — cloud command success ما زال محليًا قبل server confirmation

- **الشدة:** High.
- **المستخدمة/البيانات:** كل write journey.
- **الدليل:** `runCommand` dispatches event ويعيد النتيجة synchronous؛ pages تعرض feedback/تغلق modal. `CloudDataGate` ينفذ RPC لاحقًا. stale descendant queue عولج سابقًا، لكن caller لا ينتظر acknowledgment.
- **الأثر:** المستخدمة قد ترى نجاحًا ثم شاشة حماية/rollback بعد رفض role أو revision/network.
- **السبب:** local-first command API بقي synchronous بعد تغيير source-of-truth إلى cloud.
- **أصغر إصلاح:** acknowledgment contract مركزي، يبدأ بالحجز/المال/التسليم، ولا يعرض success أو يغلق form قبل server commit.
- **الحالات الحدية:** timeout غير معلوم، duplicate response، conflict، retry، route navigation قبل ack، async image command.
- **Regression tests:** mocked delayed success/reject، two queued writes، unmount، conflict reload.
- **التحقق:** success visible فقط بعد server revision؛ reject يحافظ form input ويشرح النتيجة.

### FC-12 — الخادم لا يعيد تطبيق قواعد العمل على snapshot

- **الشدة:** High.
- **المستخدمة/البيانات:** كل الحسابات المالية والتشغيلية، خصوصًا staff sessions.
- **الدليل:** `apply_showroom_snapshot` يتحقق من shape/revision/size وبعض append-only/length فقط. لا يتحقق من payment schema، amounts، reservation transitions أو references.
- **الأثر:** request مصاغ أو cache corrupt يمكنه append حركة مالية أو حالة غير صالحة رغم أن UI/service يرفضها.
- **السبب:** الخادم يقبل state كاملًا من client بدل commands typed أو schema/invariant validation.
- **أصغر إصلاح:** server validation للـ changed collections أولًا، ثم command-specific RPCs للمال والحالات تدريجيًا.
- **الحالات الحدية:** malformed arrays، duplicate IDs، negative amounts، cross-reference missing، admin behavior.
- **Regression tests:** PostgreSQL integration كـ anon/staff/admin، وليس regex على SQL.
- **التحقق:** invalid payloads تُرفض server-side والـ valid commands تبقى atomic.

### FC-13 — audit history قابلة للتغيير بواسطة staff

- **الشدة:** High.
- **المستخدمة/البيانات:** owner، support، التحقيق المالي.
- **الدليل:** migration 0017 أخرجت `audit-log` و`audit` من protected append-only list مع `command-log`، دون حماية بديلة.
- **الأثر:** staff session يمكنها إرسال snapshot يحذف/يغير audit rows.
- **السبب:** حل bounded command log جمعه بالخطأ مع business audit.
- **أصغر إصلاح:** migration تعيد audit append-only، وتفصل retention للـ command log.
- **الحالات الحدية:** bounded audit policy إن وجدت، admin correction، import backup، reset.
- **Regression tests:** live PostgreSQL attempt to edit/delete audit as staff fails.
- **التحقق:** audit mutation مرفوض مع استمرار valid business append.

### FC-14 — account lifecycle غير مكتمل

- **الشدة:** Medium.
- **المستخدمة/البيانات:** owner/admin وstaff onboarding.
- **الدليل:** migration تجعل أول user admin active، واللاحقين staff inactive. الواجهة تعرض disabled message؛ لا admin users page، invitation، activation، password reset أو role management.
- **الأثر:** إضافة موظفة تعتمد على Supabase dashboard/SQL غير موثق داخل المنتج.
- **السبب:** auth gate اكتمل قبل lifecycle operations.
- **أصغر إصلاح:** runbook رسمي أولًا؛ ثم admin UI محدودة بserver authorization.
- **الحالات الحدية:** last admin، deactivated active session، password reset URLs، user deletion/profile cascade.
- **Regression tests:** invite/activate/deactivate/role guards/session revocation.
- **التحقق:** مالك غير تقني يدير حساب staff دون SQL.

### FC-15 — service cancellation capability لا تعيد حالة العنصر

- **الشدة:** Medium، حاليًا backend-only/incomplete UI.
- **الدليل:** `openServiceTask` يحول item إلى inspection/laundry/maintenance. `cancelServiceTask` يغير task إلى cancelled فقط ولا يغير item status أو يطلب resulting status. لا cancel button في ServiceQueuePage.
- **الأثر:** إذا استُخدم command من caller مستقبليًا يبقى item في service status بلا task مفتوح.
- **السبب:** cancellation state machine لم يحدد outcome physical state.
- **أصغر إصلاح:** قرار مطلوب: العودة للحالة السابقة أم status صريح؟ خزّن previous status أو اطلب resulting status، ثم expose UI.
- **الحالات الحدية:** cancelled after start، future reservation، damaged item، concurrent task.
- **Regression tests:** cancellation always leaves valid item/task pairing and audit.
- **التحقق:** لا item في service state دون open task إلا إذا الحالة مقصودة ومفسرة.

### FC-16 — multi-item top-level financial fields لها معنيان متعارضان

- **الشدة:** Medium / Contradictory intent.
- **الدليل:** create multi-item يضع `reservation.securityDepositAmount` و`bookingAdvanceAmount` كمجموع كل lines. `syncTopLevelFromLines` بعد add/remove/update يضعهما من first line فقط. Type comment يقول top-level fields mirror first line، بينما finance/migration names تبدو reservation totals.
- **الأثر:** نفس الحجز يغير معنى top-level field بعد تعديل line؛ integrations/legacy readers قد تعرض أو تتحقق من مبلغ مختلف.
- **السبب:** backward-compat mirror اختلط مع canonical aggregate.
- **أصغر إصلاح:** قرار schema: top-level canonical totals أم first-line snapshot. الأفضل حقول aggregate بأسماء واضحة، وfirst-line compatibility منفصلة/deprecated.
- **الحالات الحدية:** adding/removing first line، paid contract، settlement، backup migration.
- **Regression tests:** totals invariant بعد كل line mutation، contract/CSV/finance agree.
- **التحقق:** قيمة الحقول لا يتغير معناها عبر lifecycle.

## 5. مناطق incomplete وليست bugs مخترعة

### CRUD غير مكتمل في UI

- Customer update service/command موجودان لكن لا edit form للهوية والهاتف والعنوان/status.
- Dress update/restore service موجود لكن لا general edit أو restore control واضح.
- Appointment status/delete APIs موجودة بلا controls؛ delete لا يسجل audit.
- Waitlist converted API موجود بلا caller.
- Service cancel API موجود بلا caller.

**قرار مطلوب:** أي العمليات مطلوبة للـ staff وأيها admin-only؟ لا أوصي بإضافة كل CRUD تلقائيًا؛ append-only/history rules قد تجعل بعض “edit/delete” غير مناسبة.

### Public catalogue ونموذجا الملحقات

- `catalogue_items` يُبنى من collection `dresses` فقط.
- dedicated `accessories` لا يدخل public landing.
- Add Dress يسمح `itemType='accessory'`, ويوجد في الوقت نفسه Accessories module مستقل.

**قرار مطلوب:** ما الملحق الذي يظهر للعامة ويشارك في reservation links؟ يجب تحديد canonical model قبل migration أو UI merge.

### Service dates

UI يمنع `completedDate` المستقبلي، لكن service يقبله إذا `cost=0`; إذا cost>0 يرفضه expense service. هذا validation contradiction backend/UI، لكنه غير قابل حاليًا من UI العادي. أصلحه عند فتح service milestone.

### Archive restoration

الأرشفة تحمي التاريخ، لكن customer restore غير موجود، وdress restore service ليس journey واضحة. **قرار مطلوب:** هل archive terminal إداريًا أم يجب restore بسبب أخطاء بشرية؟

## 6. validation consistency

| القاعدة | UI | Service | Server/database | الحكم |
| --- | --- | --- | --- | --- |
| Reservation dates forward/not past | create UI نعم | create/update-line نعم؛ reschedule لا يمنع past pickup | snapshot RPC لا يفحص | متناقض |
| Payment positive/non-future/open day | UI constraints | service قوي | RPC لا يفحص payload | client-only |
| Deposit liability | UI منفصل | finance/service tests قوية | normalized SQL checks؛ snapshot JSON بلا check | source-of-truth gap |
| Duplicate reservation | UI submit guard | conflict + idempotency | revision/idempotency فقط، لا overlap semantics | client-only semantics |
| Sale return once | UI | service guard | snapshot RPC لا يفحص | client-only |
| Service conflict | UI يستدعي نفس helper | helper ناقص multi-line | RPC لا يفحص | defect متسق لكنه خاطئ |
| Stocktake scope | UI يوحي partial scope | service لا يطبقه | snapshot لا يعرف scope semantics | defect |
| Role delete/reopen | UI admin-only | commands callable | RPC يمنع staff | متسق بعد الإصلاح السابق |
| Public profile | admin editor | private collection | لا public projection | missing backend |
| Image size | UI/service capture cap بعد إصلاح سابق | record validates count/type | snapshot size only | جزئي |

## 7. state machines المتحققة والمتناقضة

### Inventory

```text
available -> rented -> inspection/laundry/maintenance/damaged
available -> sold -> inspection (sale return)
archive -> inactive
```

الحالات الأساسية مطبقة. restore/archive journey ناقصة، وservice cancel لا يضمن state outcome.

### Reservation

```text
pending/confirmed -> delivered -> returned
overdue مفترض أن يعني delivered late
pending/confirmed -> cancelled
```

العيب: code يحول non-delivered expired booking إلى overdue أيضًا، بينما باقي transitions تفترض أن overdue خرج من المحل.

### Contract lines

```text
pending_delivery -> delivered/late -> returned
```

per-line path جيد نسبيًا؛ whole-contract path يستطيع إغلاق reservation مع accessory links مفتوحة.

### Appointment

```text
pending | confirmed | completed | cancelled
```

لا transition table؛ backend يقبل أي status إلى أي status، والواجهة لا تقدم transitions أصلًا.

### Waitlist

```text
waiting -> notified -> converted/closed
```

`converted` موجود في type/service/display لكنه غير reachable من UI/workflow.

### Service task

```text
open -> in_progress -> completed/cancelled
```

completed يطلب resulting item status. cancelled لا يحدد item outcome.

### Daily closing

```text
closed -> reopened
```

محليًا صحيح؛ server staff path يحتاج integration test لأن daily closing append-only policy منع replacement للـ staff، والواجهة جعلت reopen admin-only.

## 8. ما يعمل بشكل موثوق نسبيًا

- Arabic-aware internal search والهواتف العمانية.
- code/barcode uniqueness وretired codes.
- reservation overlap في create/reschedule المعتاد لكل lines.
- rental/security-deposit/booking-advance accounting في السيناريوهات المدعومة.
- over-refund/over-retention guards.
- sale invoice + one return per line + inspection state.
- daily close calculations ومنع backdated money بعد close.
- atomic local rollback وforced-failure coverage.
- backup validation/rollback/images محليًا.
- PWA manifest/service worker build contract.
- printing escaping وCSV formula injection protection.

هذا لا يلغي server validation gaps أو العيوب الحدية أعلاه.

## 9. مناطق غير متحققة

| المنطقة | السبب |
| --- | --- |
| Supabase live RLS/RPC/migrations | TLS/live project لم يكن متاحًا بأمان، ولا يجب تجربة production. |
| multi-device conflicts الفعلية | تحتاج staging وجهازين وحسابين. |
| anonymous public profile بعد deployment | backend projection غير موجود حاليًا؛ inventory live أيضًا لم يُفحص. |
| Playwright journeys | Chromium binary غير متاح؛ الاختبارات الموجودة تستخدم Supabase mocks. |
| PWA install/update/offline على جهاز | يحتاج device/deploymentين. |
| camera/barcode | يحتاج hardware permissions. |
| physical printing/CSV accountant device | يحتاج الأجهزة الفعلية. |
| Tauri | خارج official release، ولا Windows/Rust environment. |
| production data size/history | لا وصول للبيانات الخاصة؛ يجب قياس counts/bytes فقط بموافقة. |

## 10. قرارات product المطلوبة قبل بعض الإصلاحات

1. سياسة رد/احتجاز `booking_advance` عند الإلغاء.
2. هل partial accessory return يبقي العقد مفتوحًا أم ينشئ queue مستقلة؟
3. معنى stocktake scope وكيف تُنسب القطع للرف/الفئة.
4. status واضح للـ no-show وكيف يؤثر على الدفعة والسلوك.
5. الحالة النهائية للقطعة عند cancel service task.
6. canonical accessory model: generic inventory أم dedicated accessories أم فصل واضح.
7. top-level multi-item fields: aggregate totals أم first-line compatibility.
8. من يملك edit/restore/account activation: admin أم staff.

## 11. quick wins الآمنة بعد الموافقة

هذه لا تحتاج migration واسعة:

1. إصلاح service conflict ليقرأ كل contract lines.
2. إضافة audit إلى `addContractLine` داخل command boundary.
3. إظهار future appointments وعدم إضافتها إلى today state.
4. توسيع outstanding reminders لتشمل returned unpaid.
5. إزالة/تعطيل stocktake scope حتى يوجد model حقيقي، بدل نتائج فقدان كاذبة.
6. تمرير waitlist context إلى reservation form؛ conversion atomic تأتي بعده.

## 12. أول milestone إصلاح موصى به

### Milestone 1 — حماية الأصول والعقود من الحالات بلا مخرج

الترتيب:

1. **FC-01:** لا تغلق rental follow-up بينما accessories outstanding، وحرر undelivered reserved accessories.
2. **FC-02:** افصل no-show عن overdue return وأضف close path مدققًا.
3. **FC-04:** أصلح service conflicts لكل line.
4. **FC-06:** اجعل stocktake full-only مؤقتًا أو طبّق scope حقيقي.
5. أضف end-to-end service tests تجمع dashboard/reminders/waitlist، لا assertions داخل service واحد فقط.

بعده Milestone مالي منفصل لـ FC-03، لأن سياسة booking advance تحتاج قرار مالك ولا يجوز اختراعها.

### معيار الخروج

- لا reservation returned مع أصل خارج المحل بلا queue.
- لا expired never-delivered reservation بلا action.
- لا secondary booked item يدخل service.
- scoped stocktake لا يبلغ عن خارج النطاق.
- full 682+ tests، typecheck، lint، build، وbrowser journey عند توفر Chromium.

## 13. الخلاصة البسيطة

- **العيوب المخفية الأهم:** ملحقات تضيع من المتابعة، no-show يحبس الحجز، دفعة الحجز تمنع الإلغاء بلا refund path، service لا يرى القطعة الثانية، والصفحة العامة لا ترى إعدادات المالك.
- **أخطر تناقض:** الحجز يصبح `returned` بينما ملحق ما زال `delivered`، ثم dashboard يعرض صفرًا.
- **أسرع مكاسب:** multi-line service guard، add-line audit، future appointments، returned-balance reminders، وتعطيل scope الوهمي.
- **البداية الموصى بها:** Milestone حماية الأصول والعقود أعلاه، دون migrations أو تغيير معماري واسع. سياسة دفعة الحجز تأتي بعد قرار صريح من المالك.
