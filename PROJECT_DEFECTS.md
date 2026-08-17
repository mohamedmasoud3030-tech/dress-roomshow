# سجل عيوب مشروع LENA

> آخر تحديث: 2026-08-17
>
> الفرع: `arena/01a00fc5-lenadress`
>
> الأساس قبل الإصلاح: `7930a9e5e9b4c200f5d6bdbbf9ca1d5edd0987f4`

هذا السجل يحتوي **عيوبًا مؤكدة فقط**. المخاطر غير المثبتة والمناطق التي تحتاج بيئة خارجية موجودة في `FULL_PROJECT_AUDIT.md` ولا تُعرض هنا كأخطاء مؤكدة.

## 1. Baseline قبل الإصلاح

| الفحص | النتيجة قبل الإصلاح |
| --- | --- |
| `npm test` | PASS — 676/676، لكنه لم يحتو اختبارات العيوب أدناه. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |
| `npm run build` | PASS. |
| `npm audit --omit=dev` / `npm audit` | 0 vulnerabilities. |
| `npm run test:e2e` | تعذر بدء 12/12 حالة لأن Playwright Chromium executable غير موجود. محاولة تنزيله فشلت شبكيًا بـ `ECONNRESET`. هذا عائق بيئة وليس نتيجة وظيفية. |

## 2. ملخص الحالة

| ID | الشدة | الحالة | النظام |
| --- | --- | --- | --- |
| DEF-001 | High | **Fixed** | Reservations / idempotency |
| DEF-002 | High | **Partially fixed** | Cloud commit queue |
| DEF-003 | High | **Fixed at UI boundary** | Roles / daily close / deletion |
| DEF-004 | High | **Fixed in migration 0019 — not applied externally** | Audit authorization |
| DEF-005 | High | **Hardened in migration 0019 — not applied externally** | Server-side snapshot integrity |
| DEF-006 | Medium | **Fixed** | Inventory images / form state |
| DEF-007 | Medium | **Fixed** | Backup audit persistence |
| DEF-008 | Medium | **Fixed** | Private browser cache |
| DEF-009 | Medium | **Fixed for activation/roles** | Account lifecycle |
| DEF-010 | Medium | **Fixed** | Condition photos / mobile memory |
| DEF-011 | Medium | **Fixed** | Image removal accessibility |
| DEF-012 | High | **Fixed** | Accessory return / asset tracking |
| DEF-013 | High | **Fixed** | Multi-item service conflicts |
| DEF-014 | Medium | **Fixed** | Contract-line audit |
| DEF-015 | Medium | **Fixed** | Future appointments |
| DEF-016 | Medium | **Fixed** | Returned-balance reminders |
| DEF-017 | High | **Fixed at UI contract** | Stocktake scope honesty |
| DEF-018 | High | **Fixed** | Never-delivered expired reservations |
| DEF-019 | High | **Fixed with documented default policy** | Booking-advance cancellation |
| DEF-020 | High | **Implemented in migration 0020 — not applied externally** | Public showroom profile |
| DEF-021 | Medium | **Fixed** | Atomic waitlist conversion |
| DEF-022 | Medium | **Fixed** | Service cancellation item state |
| DEF-023 | Medium | **Fixed** | Multi-item financial aggregates |
| DEF-024 | High | **Fixed** | Public contact trust |
| DEF-025 | High | **Fixed** | Empty reservation onboarding |
| DEF-026 | High | **Fixed** | Contextual loading state |
| DEF-027 | High | **Fixed** | Password recovery/support copy |
| DEF-028 | Medium | **Fixed** | Staff permission feedback |
| DEF-029 | Medium | **Fixed** | Settings danger hierarchy |
| DEF-030 | Low | **Fixed** | Route titles and terminology |
| DEF-031 | Medium | **Fixed** | Mobile landing CTA/contrast |

## 3. العيوب المكتملة

### DEF-001 — الحجز الثاني يستخدم نفس idempotency key

- **الشدة:** High.
- **العرض للمستخدمة:** بعد إنشاء حجز، فتح النافذة مرة ثانية وإنشاء حجز آخر ينتج duplicate-command error حتى إعادة تحميل الصفحة.
- **الدليل قبل الإصلاح:** `CreateReservationModal.tsx` كان يستخدم:

  ```ts
  const [submissionKey] = useState(() => createSubmissionKey('rsv'));
  ```

  والـ modal يبقى mounted داخل `ReservationsPage`; لم يكن المفتاح يتجدد عند `open`.
- **السبب الجذري:** ربط مفتاح submit بعمر component بدل عمر فتح النموذج.
- **النطاق المحتمل للانحدار:** reservation wizard، duplicate protection، prefill من availability.
- **الإصلاح:** أضيف `setSubmissionKey` ويولد مفتاح `rsv` جديد داخل initialization effect لكل فتح، مع الإبقاء على نفس المفتاح طوال محاولة submit الواحدة.
- **التحقق:** `tests/stabilization-regressions.test.mjs` يثبت وجود دورة المفتاح الجديدة، واختبارات workflows القديمة ما زالت تثبت رفض الضغط المكرر بنفس المفتاح.
- **النتيجة:** focused tests وfull suite نجحت.

### DEF-003 — أزرار destructive/reopen لا تطابق صلاحيات staff على الخادم

- **الشدة:** High.
- **العرض للمستخدمة:** موظفة `staff` كانت ترى إعادة فتح اليومية وحذف عميلة/قطعة بلا تاريخ، تنفذ التغيير محليًا، ثم يرفضه RPC ويعيد hydration.
- **الدليل:** migration 0016/0017 تمنع staff من تعديل `daily-closings` السابقة أو تقليل طول `customers`/`dresses`. الواجهات لم تكن تفحص role.
- **السبب الجذري:** route auth موجود، لكن action visibility لم تُشتق من server role rules.
- **النطاق:** daily close، customer list، inventory detail.
- **الإصلاح:** `useAuth()` يحدد `isAdmin`; زر reopen والحذف النهائي يظهران للـ admin فقط. الأرشفة والتشغيل اليومي يبقيان للـ staff.
- **التحقق:** regression test يقرأ الحدود الثلاثة، و`test:auth`, `test:daily-closing`, `test:ui-contract` نجحت.
- **ملاحظة:** server يبقى الحماية النهائية؛ هذا الإصلاح يمنع success/rollback المربك في الواجهة ولا يضعف RLS/RPC.

### DEF-006 — صور القطعة السابقة تبقى في نموذج إضافة قطعة جديدة

- **الشدة:** Medium.
- **العرض:** بعد إغلاق/إتمام إضافة قطعة وإعادة فتح النموذج، صور القطعة السابقة تبقى وقد تُحفظ مع القطعة التالية.
- **الدليل:** `images` كان React state مستقلًا؛ `reset(getDefaultValues())` لا يمسه، ولم يوجد `setImages([])` في open/close.
- **السبب:** reset اقتصر على React Hook Form fields.
- **النطاق:** inventory creation، catalogue images، privacy.
- **الإصلاح:** تصفير الصور عند كل فتح وعند الإغلاق.
- **التحقق:** regression assertion يطلب مساري reset، وbuild/type/lint/full test نجحت.

### DEF-010 — صور الحالة بلا حد للحجم قبل decode

- **الشدة:** Medium.
- **العرض:** اختيار صورة هاتف ضخمة يمكن أن يقرأها `FileReader` ويفكها على main thread قبل الضغط، وقد يجمد الصفحة أو يسقط tab.
- **الدليل:** `ConditionPhotoCapture` كان يفلتر MIME وعدد الصور فقط؛ لا يفحص `file.size`.
- **السبب:** الاعتماد على الضغط اللاحق بدل حماية مرحلة الإدخال.
- **النطاق:** delivery/return، mobile camera، memory.
- **الإصلاح:** حد 12 MiB لكل صورة ورسالة عربية قبل استدعاء compression/decode.
- **التحقق:** pure test للحد والقيمة الحدية؛ `test:condition-evidence` 16/16 وregression suite نجحت.

### DEF-011 — زر حذف صورة المخزون غير مرئي على touch وبلا اسم

- **الشدة:** Medium.
- **العرض:** الزر كان `opacity-0` ويظهر فقط مع `group-hover`; على الهاتف لا توجد hover مستقرة، وعلى keyboard لا يظهر عند focus. لم يكن له `aria-label`.
- **السبب:** تصميم desktop-hover طُبق على control أساسي.
- **النطاق:** inventory form، touch، accessibility.
- **الإصلاح:** الزر ظاهر افتراضيًا على الهاتف، hover behavior يبدأ من `sm`, ويظهر عند `focus-visible`، مع `aria-label` وإخفاء icon زخرفيًا.
- **التحقق:** regression test + `test:ui-contract` 40/40.

### DEF-012 — إغلاق الحجز كان يخفي ملحقًا ما زال خارج المحل

- **الشدة:** High.
- **العرض قبل الإصلاح:** whole return بملحقين يمكن أن يسجل حالة واحد فقط، ثم يجعل reservation `returned`. بقي الملحق الآخر `delivered`، لكن dashboard كان يعرض `accessoriesOutCount=0` لأن الحجز لم يعد active.
- **الدليل التشخيصي:** `reservationStatus=returned`, `outstanding=1`, `dashboardOut=0`.
- **السبب الجذري:** partial accessory links لم تُربط بشرط إغلاق rental أو dashboard المبني على active reservations.
- **الإصلاح:** whole-contract return يرفض الإغلاق حتى تُسجل حالة كل delivered accessories. الملحقات المرتبطة التي لم تُسلّم أصلًا تتحرر إلى `available` عند إغلاق الحجز. dashboard يحسب handover links مباشرة كحماية للبيانات التاريخية غير المتسقة. كما يرفض accessory service تسجيل return لملحق لم يُسلّم.
- **النطاق:** delivery/return، accessory links/status، dashboard، backup fixtures.
- **التحقق:** `test:accessories` 18/18، `test:accessory-backup` 9/9، `test:dashboard` 11/11، `test:inventory-performance` 19/19، والـ full suite.
- **نتيجة القبول:** partial whole-return يفشل قبل أي mutation؛ reservation يبقى delivered وكل الملحقات تبقى ظاهرة. Full return يحرر الملحقات undelivered.

### DEF-013 — service conflict تجاهل القطع الثانوية في العقد

- **الشدة:** High.
- **العرض قبل الإصلاح:** في عقد D-001 + D-002 كان blocker لـ D-002 فارغًا، وفتح service task متداخل ينجح.
- **السبب:** `getServiceConflictBlockers` قارن `reservation.dressCode` top-level فقط.
- **الإصلاح:** فحص كل `ContractLine` حسب code وتواريخ line، بما في ذلك pending line داخل عقد partial-delivered.
- **التحقق:** test جديد يفتح عقدًا متعدد البنود ويحاول صيانة secondary item؛ يُرفض ولا يُكتب task. `test:service` 10/10.

### DEF-014 — إضافة بند إلى العقد لم تسجل audit

- **الشدة:** Medium.
- **العرض قبل الإصلاح:** audit count قبل وبعد `addContractLine` بقي نفسه (`delta=0`) رغم تغير السعر وعدد القطع.
- **السبب:** add path استدعى `persist` دون `recordAudit`، بعكس update/remove.
- **الإصلاح:** audit داخل نفس transaction boundary مع line identity، dates، rental/deposit/advance والعدد قبل/بعد.
- **التحقق:** `test:multi-item` يثبت زيادة audit مرة واحدة واحتواء summary على code؛ 20/20 PASS.

### DEF-015 — المواعيد المستقبلية كانت تختفي بعد refresh

- **الشدة:** Medium.
- **العرض قبل الإصلاح:** موعد مستقبلي يُحفظ ثم يُضاف مؤقتًا لقائمة “اليوم”، وبعد refresh يختفي لأن الصفحة تقرأ `getTodaysAppointments()` فقط.
- **السبب:** UI state لم يميز today/upcoming، ولا query للمواعيد القادمة.
- **الإصلاح:** `getUpcomingAppointments()` مرتبة بالتاريخ والوقت، section قادمة مستقلة، وrefresh موحد بعد الإنشاء بدل append إلى today.
- **التحقق:** diagnostic test يثبت future not today + visible upcoming، و`test:catalog-sales-appointments` 7/7.

### DEF-016 — الدين بعد استرجاع القطعة لم يظهر في reminders

- **الشدة:** Medium.
- **العرض قبل الإصلاح:** returned reservation ذات remaining balance تظهر في dashboard، لكنها تُحذف من `getReminders` قبل outstanding check.
- **السبب:** active operational status filter استُخدم أيضًا للتحصيل المالي.
- **الإصلاح:** reminders تقرأ كل non-cancelled reservations؛ شروط pickup/return ما زالت مقيدة بالحالات المناسبة، بينما outstanding يشمل returned.
- **التحقق:** test returned+unpaid يعطي critical outstanding reminder؛ `test:reminders` 14/14.

### DEF-017 — واجهة الجرد وعدت بنطاق رف غير مطبق

- **الشدة:** High بسبب false missing results.
- **العرض قبل الإصلاح:** النص قال “المحل كاملًا أو رفًا واحدًا”، لكن service يحاسب كل inventory دائمًا.
- **السبب:** free-text `scope` خُزن كوصف ولم يتحول إلى item membership/filter.
- **الإصلاح الآمن:** لم نخترع scoped model. أصبحت الواجهة تصرح أن الجلسة تشمل كامل المخزون، وأن الحقل ملاحظة تنظيمية فقط. أزيل الوعد بجرد رف واحد.
- **التحقق:** UI contract يمنع عودة النص القديم ويطلب copy الكامل؛ `test:ui-contract` 40/40.
- **المتبقي:** scoped stocktake الحقيقي يحتاج model/location decision مستقل؛ لا يُدعى أنه موجود.

### DEF-018 إلى DEF-023 — إغلاق بقية المسارات الوظيفية

- **DEF-018:** الحجز المنتهي الذي لم يُسلّم لا يتحول إلى overdue return؛ يبقى قابلًا للإلغاء، بينما delivered past-due فقط يصبح overdue.
- **DEF-019:** booking advance المحصلة تسمح cancellation فقط بعد سبب وإقرار صريح بسياسة عدم الاسترداد؛ لا تُخترع refund movement وتبقى الإيرادات متطابقة.
- **DEF-020:** migration 0020 تنشئ `showroom_public_profile` عامًّا ضيقًا وتزامنه من private snapshot؛ `/landing` يقرأ projection لا `showroom_state`. لم تُطبق migration خارجيًا.
- **DEF-021:** waitlist prefill يحمل customer/item/dates/id، وإنشاء الحجز يحول entry داخل نفس rollback boundary مع validation للمطابقة.
- **DEF-022:** service task يخزن previous item status ويلغى بإعادته، بدل ترك القطعة في maintenance بلا task.
- **DEF-023:** top-level `securityDepositAmount` و`bookingAdvanceAmount` في multi-item أصبحت aggregates ثابتة المعنى بعد add/remove line.
- **إضافي:** sign-out يمسح private cache/images مع بقاء PIN؛ backup audit يمر عبر command؛ admin تستطيع تفعيل الحسابات الموجودة وتحديد role.

### DEF-024 إلى DEF-031 — إصلاحات تجربة المنتج بعد الاختبار المرئي

- أزيلت أرقام وبريد alternate hardcoded غير المعتمدة من public defaults، مع sticky WhatsApp CTA للهاتف وتحسين contrast للنصوص الثانوية.
- reservation wizard يتيح إنشاء عميلة أو قطعة مفقودة داخل الرحلة والعودة بنفس context.
- global loading copy أصبح يشرح تحميل آخر نسخة للمعرض بدل تفاصيل عنصر/باركود.
- login أصبح `main` landmark ويحتوي password reset وشرح تفعيل الحساب.
- staff ترى رسالة «هذه الصفحة للمديرة فقط» بدل redirect صامت.
- reset نُقل إلى Danger Zone مستقلة أسفل settings، وأضيف retry لإدارة الحسابات.
- document titles أصبحت route-specific، ووُحد مصطلح «العميلات».
- **الدليل:** تجربة Chromium فعلية على 1440×1000 و390×844، source regression tests، typecheck/lint/build/full suite.

## 4. عيب تم إصلاح جزء آمن منه

### DEF-002 — descendant snapshot قد يعيد عملية cloud مرفوضة

- **الشدة:** High.
- **العرض الأصلي:** إذا اصطفت عمليتان مبنيتان على بعضهما، ثم رفض الخادم الأولى، يعيد التطبيق `before` ويفعل hydrate، لكن العملية الثانية كانت تبقى في Promise queue ومعها `detail.after` القديم. إرسالها لاحقًا يمكن أن يعيد أثر الأولى المرفوضة.
- **مسار واقعي:** `addDress` يبدأ best-effort image sync غير متزامن، وقد ينشر command تابعًا أثناء commit إنشاء القطعة.
- **السبب:** queue لا يملك lineage/generation invalidation.
- **الإصلاح المنفذ:** `commitGenerationGuard` يعطي كل queue generation. أول rejection يعمل `invalidate()`، وكل descendant snapshot captured قبل الفشل يصبح no-op. العمل الجديد بعد recovery يحصل على generation جديد.
- **التحقق:** pure regression test يثبت invalidation لكل descendants، و`test:cloud-source-of-truth`, workflow tests، full suite نجحت.
- **المتبقي المؤكد:** command caller ما زال يعرض النتيجة المحلية قبل server acknowledgment. إصلاح هذا يتطلب تغيير contract لعدد كبير من synchronous commands/pages إلى acknowledgment قابل للانتظار، لذلك لم يُوسّع ضمن milestone الصغير.
- **أصغر خطوة تالية:** تصميم `command committed/rejected` acknowledgment مركزي، ثم تحويل الرحلات المالية/الحجز أولًا مع browser integration test.

## 5. العيوب المفتوحة المؤكدة

### DEF-004 — سجل audit غير append-only للـ staff

- **الشدة:** High.
- **العرض/الأثر:** حساب staff موثق يستطيع إرسال snapshot معدل يحذف أو يغير `audit-log`/`audit`; التحقيق والمساءلة غير موثوقين.
- **الدليل:** migration 0016 وضعت المجموعتين في protected list. migration 0017 تستبدل القائمة وتزيل `audit-log`, `audit`, `command-log` معًا، ولا تضيف حماية بديلة للـ audit.
- **السبب:** إصلاح bounded command log أزال audit بالخطأ مع log القابل للتقليم.
- **الاعتماد:** يحتاج migration جديدة واختبار PostgreSQL فعلي.
- **أصغر إصلاح:** إعادة audit collections إلى append-only، وفصل trimming للـ command log فقط.
- **التحقق المتبقي:** migration لم تُطبق خارجيًا؛ يلزم PostgreSQL integration وbackup قبل production.

### DEF-005 — RPC يثق في business payload القادم من العميل

- **الشدة:** High.
- **العرض/الأثر:** staff session يمكنه استدعاء `apply_showroom_snapshot` مباشرة وإضافة object مصاغ إلى financial arrays. RPC يفحص أن القديم contained في الجديد لكنه لا يتحقق من schema أو total أو transition للحركة المضافة.
- **الدليل:** migration 0016 تتحقق من application ID/collections/size/revision وبعض lists/length؛ لا validation كاملة لـ `payments`, `sales`, `expenses` records.
- **السبب:** نقل business transaction كاملة إلى full client snapshot مع حماية عامة بدل command-specific server rules.
- **النطاق:** المال، التقارير، audit، insider/XSS boundary.
- **أصغر إصلاح قصير:** schema + invariant validation للمجموعات التي تغيرت داخل RPC.
- **الإصلاح الأقوى:** command-specific RPCs للمال والحالات.
- **التحقق المتبقي:** validation migration مكتوبة وغير مطبقة؛ command-specific RPCs مؤجلة كتغيير معماري.

### DEF-007 — audit تصدير النسخة لا يُنشر كـ cloud command

- **الشدة:** Medium.
- **العرض:** `exportBackupForDownload` يكتب `recordAudit` مباشرة بعد download خارج `runCommand`. إذا أعادت المستخدمة التحميل قبل command آخر، hydration يمحو audit المحلي غير المنشور.
- **الدليل:** backup service يستدعي `recordAudit` مباشرة ولا يطلق `publishShowroomCommandCommitted`.
- **السبب:** download side effect منفصل عن workflow/cloud boundary.
- **أصغر إصلاح:** command صريح لتسجيل نجاح export مع acknowledgment، واختبار reload مباشرة بعد export.
- **التحقق:** export audit يمر الآن عبر command runner؛ server acknowledgment العام يبقى ضمن DEF-002.

### DEF-008 — البيانات الخاصة تبقى في browser cache بعد sign-out

- **الحالة:** Fixed؛ sign-out يمسح collections وصور IndexedDB ويحافظ على PIN المنفصل.
- **الشدة:** Medium.
- **العرض:** customer/finance snapshot يبقى في مفاتيح `dress-roomshow:*` بعد `supabase.auth.signOut()`.
- **الدليل:** `signOut` لا يستدعي clear cache؛ `CloudDataGate` يستورد snapshot كاملًا إلى localStorage.
- **السبب:** cache مصمم للاستمرارية ولم تُحدد privacy policy للجهاز المشترك.
- **أصغر إصلاح تقني:** مسح operational cache بعد نجاح sign-out دون مسح PIN.
- **التحقق:** auth regression يثبت مسح operational cache والصور دون إزالة device PIN.

### DEF-009 — لا توجد رحلة لتفعيل حساب staff جديد

- **الشدة:** Medium.
- **العرض:** الحسابات الجديدة بعد الأول تصبح `staff` و`is_active=false`; التطبيق يعرض أنها موقوفة، لكن admin لا يملك شاشة تفعيل.
- **الدليل:** migration 0011 `is_first_user` فقط active؛ `AccountSettings.tsx` يعرض الحساب والخروج ولا يحدث profiles.
- **السبب:** RLS/account model أضيف بلا admin lifecycle UI/runbook تنفيذي.
- **الإصلاح:** شاشة admin داخل Preferences لتفعيل/تعطيل الحسابات الموجودة وتحديد role عبر RLS؛ إنشاء Auth user يبقى خارجيًا.
- **الاعتماد:** يحتاج فحص Supabase حي وتحديد onboarding policy.

## 6. التحقق بعد الإصلاح

| الأمر | النتيجة |
| --- | --- |
| `npm run test:stabilization` | PASS — 5/5. |
| `npm run test:cloud-source-of-truth` | PASS — 4/4. |
| `npm run test:mobile-polish` | PASS — 5/5. |
| `npm run test:condition-evidence` | PASS — 16/16. |
| `npm run test:ui-contract` | PASS — 40/40. |
| `npm run test:daily-closing` | PASS — 2/2. |
| `npm run test:auth` | PASS — 8/8. |
| `npm run test:workflows` | PASS — 10/10. |
| `npm run test:operational-atomicity-diagnostics` | PASS — 7/7. |
| `npm run test:accessories` | PASS — 18/18. |
| `npm run test:accessory-backup` | PASS — 9/9. |
| `npm run test:service` | PASS — 10/10. |
| `npm run test:multi-item` | PASS — 20/20. |
| `npm run test:catalog-sales-appointments` | PASS — 7/7. |
| `npm run test:reminders` | PASS — 14/14. |
| `npm run test:dashboard` | PASS — 11/11. |
| `npm run test:inventory-performance` | PASS — 19/19. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |
| `npm test` | PASS — **698/698**, 64 invocations، 0 failures، 0 skipped. |
| `npm run build` | PASS — 2217 modules، PWA 138 precache entries. |
| `npm audit --omit=dev` / `npm audit` | 0 vulnerabilities. |

## 7. الملفات المعدلة في milestone الحالي

Runtime:

```text
src/features/reservations/CreateReservationModal.tsx
src/features/dresses/AddDressModal.tsx
src/features/dresses/ImageUpload.tsx
src/features/delivery-return/ConditionPhotoCapture.tsx
src/features/reports/DailyClosingPage.tsx
src/features/dresses/DressDetailsPage.tsx
src/features/customers/CustomersPage.tsx
src/features/sync/CloudDataGate.tsx
src/features/sync/commitGenerationGuard.ts

# Functional asset/operations milestone
src/features/accessories/reservationAccessory.service.ts
src/features/appointments/AppointmentsPage.tsx
src/features/appointments/appointment.service.ts
src/features/dashboard/dashboard.service.ts
src/features/delivery-return/DeliveryAccessoryChecklist.tsx
src/features/delivery-return/deliveryReturn.operations.ts
src/features/reminders/reminder.service.ts
src/features/reservations/reservation.service.ts
src/features/service/service.service.ts
src/features/stocktake/StocktakePage.tsx
```

Tests/config:

```text
tests/stabilization-regressions.test.mjs
tests/accessory-lifecycle.test.mjs
tests/accessory-backup-integrity.test.mjs
tests/catalog-sales-appointments-diagnostics.test.mjs
tests/dashboard-operations.test.mjs
tests/inventory-performance.test.mjs
tests/multi-item-contracts.test.mjs
tests/reminders-whatsapp.test.mjs
tests/service-workflow.test.mjs
tests/ui-contract.test.mjs
package.json
```

Documentation:

```text
PROJECT_DEFECTS.md
```

## 8. المتبقي بعد الإصلاح المحلي

- `DEF-002`: الواجهة ما زالت تستلم نتيجة local command قبل Supabase acknowledgment؛ إصلاحها الكامل يتطلب تحويل command API المتزامن إلى async على عشرات المسارات، وهو تغيير معماري لم يُخفَ أو يُدّع اكتماله.
- migrations `0019` و`0020` مكتوبة ومختبرة نصيًا فقط، ولم تُطبق على Supabase أو production.
- إنشاء Auth user جديد واستعادة كلمة المرور يظلان في Supabase boundary؛ واجهة التطبيق تدير التفعيل والدور للحسابات الموجودة.
- live PostgreSQL/RLS، multi-device، Playwright browser، camera، printing وPWA device checks ما زالت خارج البيئة الحالية.

**الخطوة التالية:** تطبيق migrations في staging مع backup وPostgreSQL role tests، ثم تحويل أهم commands (payment/reservation/delivery) إلى server-acknowledged async flow قبل production.
