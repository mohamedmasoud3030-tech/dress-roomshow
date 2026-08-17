# التدقيق المستقل الكامل لمشروع LENA

> تاريخ التدقيق: 2026-08-17  
> الفرع: `arena/01a00fc5-lenadress`  
> الأساس المفحوص: `7930a9e5e9b4c200f5d6bdbbf9ca1d5edd0987f4`  
> نطاق التدقيق: المنتج، الصحة الوظيفية، الكود، البيانات، الأمن، الاختبارات، UX، الأداء، PWA والتشغيل.

## 1. الملخص التنفيذي

LENA منتج واسع ومترابط لإدارة معرض واحد، وليس مجرد واجهة تجريبية. توجد رحلات حقيقية للمخزون والعملاء والحجوزات والتسليم والاسترجاع والمال والمبيعات والخدمة والجرد والإقفال والتقارير، مع واجهة عربية RTL وPWA. البنية تحتوي اختبارات كثيرة، ونجحت بوابة Node الحالية كاملة: **676/676**، كما نجح TypeScript وESLint والبناء وdependency audit.

لكن نجاح هذه الفحوص لا يكفي لاعتماد الإصدار. التدقيق وجد مشكلات وظيفية وصلاحيات وتزامن لا تغطيها الاختبارات الحالية، أهمها:

1. إنشاء حجز ثانٍ من نفس الصفحة يُرفض بمفتاح idempotency قديم حتى إعادة تحميل الصفحة.
2. واجهة التطبيق تعتبر الأمر ناجحًا قبل تأكيد Supabase، ومسار queue قد يعيد إدخال عملية رفضها الخادم عند وجود أمر لاحق معلّق.
3. موظفة `staff` ترى زر إعادة فتح اليومية، لكن RPC يرفض التعديل بسبب قاعدة append-only.
4. migration 0017 أزالت حماية append-only عن `audit-log` و`audit`، فأصبح سجل التدقيق قابلًا للتعديل داخل snapshot موظفة موثقة.
5. RPC المركزي يقبل snapshot كاملًا من العميل مع تحقق شكلي محدود؛ موظفة تملك session تستطيع صياغة request يضيف حركات مالية غير متحققة من قواعد العمل على الخادم.

توجد أيضًا مخاطر تشغيلية مهمة: لا توجد آلية مؤكدة في المستودع لنسخ Supabase واستعادته، commit كامل للـ snapshot بعد كل عملية بحد 20 MiB، حالة النشر وschema الحي غير مثبتة، واختبارات E2E تستخدم Supabase mocks ولا تنفذ migrations على PostgreSQL حقيقي.

### قرار الإصدار

**القرار: HOLD — لا أوصي بإطلاق جديد أو توسيع الاستخدام قبل إغلاق Milestone 1 وMilestone 2 أدناه.**

- لا يوجد دليل على تسريب credentials خاصة أو ثغرة anonymous مؤكدة من الكود.
- لا أصف المشروع بأنه “مكسور بالكامل”: البناء والاختبارات المالية والخدمات المحلية قوية.
- لكن توجد عدة مشكلات **High** في رحلة الحجز، صلاحيات staff، سلامة audit، وحدود الثقة بين المتصفح والخادم. هذه مشكلات إصدار وليست تحسينات شكلية.

## 2. منهج التدقيق والأدلة

تم فحص:

- جميع جذور `src/`, `tests/`, `supabase/migrations/`, `.github/workflows/`, `src-tauri/` والإعدادات.
- router، guards، shell، صفحات الرحلات والخدمات وworkflow engine وcloud gate.
- migrations 0001–0018، RLS، RPC، indexes، constraints وstorage policies.
- PWA manifest/workbox/update flow وVercel headers.
- Git state وlatest CI وdependencies.
- الاختبارات نفسها، وليس نتائجها فقط؛ وُجد أن عددًا مهمًا منها يقرأ source text بدل تنفيذ السلوك.

لم تُستخدم تقارير قديمة كدليل منفرد. عندما تعارض التعليق أو الوثيقة مع الكود، اعتمد هذا التقرير على الكود والفحص المنفذ.

### حالة Git قبل إضافة هذا التقرير

كانت الملفات التالية موجودة كتغييرات غير متتبعة سابقة، وتم الحفاظ عليها دون تعديل أو حذف:

```text
ARCHITECTURE.md
PROJECT_COMMANDS.md
PROJECT_OVERVIEW.md
PROJECT_STATUS.md
```

لم تُعدّل ملفات runtime أو migrations أو dependencies. ملفات `test-results/` التي ولدتها محاولة Playwright في هذه الجولة حُذفت لأنها artifact تشخيصي جديد وليست عملًا سابقًا.

## 3. خريطة المخاطر على مستوى المشروع

| المجال | التقييم | السبب المختصر |
| --- | --- | --- |
| المنتج والرحلات | أحمر | خلل مؤكد في إنشاء الحجز الثاني، وتعارض صلاحية إعادة فتح اليومية. |
| صحة البيانات والمال | أحمر | العميل يرسل snapshot كاملًا؛ server validation لا يعيد تنفيذ معظم قواعد العمل، مع مشكلة queue/ack. |
| الأمن والصلاحيات | أحمر | audit قابل للتغيير بواسطة staff، وfinancial append يمكن تزوير شكله عبر RPC مباشر بحساب موثق. |
| قاعدة البيانات | برتقالي | RLS وrevision جيدان، لكن source-of-truth JSON واحد وحدوده/retention/backup غير مكتملة. |
| الاختبارات | برتقالي | 676 اختبار ناجح، لكن لا PostgreSQL integration، وE2E mocks كل Supabase، وعدة gates assertions نصية. |
| UX والوصول | برتقالي | RTL/mobile foundation جيدة، لكن نجاح كاذب قبل server ack ومشكلات صور ولمسات. |
| الأداء | برتقالي | full snapshot serialization/upload، صور داخل JSON، bundle/precache كبير نسبيًا. |
| PWA | أصفر | manifest/cache/update جيد في build؛ التثبيت الحقيقي والبيانات المصادق عليها على جهاز غير متحققين. |
| التشغيل والاستعادة | أحمر | لا server backup/restore drill أو migration/deploy/rollback pipeline متحقق. |
| صحة الكود | أصفر/برتقالي | boundaries موجودة، لكن compatibility layers وملفات ضخمة وsuppression وازدواج نماذج. |

## 4. جدول النتائج

التصنيفات:

- **Confirmed defect:** يثبت مباشرة من مسار الكود أو نتيجة أمر.
- **Probable risk:** تصميم أو غياب حماية يجعل المشكلة مرجحة، لكن الإنتاج الحي لم يكن متاحًا لإثبات occurrence.
- **Recommendation:** تحسين وقائي بلا defect حالي مثبت.
- **Unknown:** يحتاج بيئة خارج المستودع.

| ID | الشدة | التصنيف | النتيجة والدليل | الأثر على المستخدم/العمل | المناطق | أصغر معالجة موصى بها |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | High | Confirmed defect | `CreateReservationModal.tsx:91` ينشئ `submissionKey` مرة واحدة فقط. لا يوجد `setSubmissionKey` عند كل فتح، بينما `ReservationsPage.tsx` يبقي modal mounted. `runCommand` يرفض المفتاح المنفذ سابقًا. | بعد أول حجز ناجح، الحجز التالي في نفس الجلسة يفشل كـ duplicate حتى reload؛ رحلة أساسية مكسورة. | Reservations, idempotency, UX | اجعل المفتاح state يُجدد في effect عند `open`, مثل `AddPaymentModal` و`OpenServiceTaskModal`، وأضف component test لحجزين متتاليين. |
| F-02 | High | Confirmed defect / race | `runCommand` في `commandRunner.ts` يعيد النتيجة بعد dispatch ولا ينتظر `commitShowroomState`. الصفحات تعرض success فورًا. `CloudDataGate.tsx` يصطف snapshots؛ عند فشل الأول يعيد `detail.before` ثم hydrate، لكن queue التالي يظل يحمل `detail.after` القديم ويمكن أن يعيد العملية المرفوضة. المسار async للصور في `dress.service.ts` قادر على نشر أمر ثانٍ أثناء الأول. | نجاح كاذب، rollback متأخر، أو عودة بيانات رفضها الخادم؛ خطر سجل ومخزون غير متوقع. | Cloud sync, all workflows, images | أعد server acknowledgment إلى command caller. كحل أصغر أولًا: generation token يلغي كل queued snapshots بعد أول failure، ولا تعرض success قبل ack. أضف test تشغيلي لأمرين ثم رفض الأول. |
| F-03 | High | Confirmed defect | `DailyClosingPage.tsx` يعرض reopen لكل مستخدم مصادق. service يستبدل closed object بـ reopened object. RPC في migration 0016/0017 يفرض `daily-closings` append-only للـ staff باستخدام JSON containment؛ replacement يفشل. | الموظفة ترى إجراءً مسموحًا ثم يحصل failure/rehydration. الإقفال قد يحتاج admin دون أن تقول الواجهة ذلك. | Roles, daily close, cloud RPC | قرر requirement: إما admin-only في UI/service، أو غيّر نموذج reopen إلى append-only event يقبله server. لا تخفِ الخطأ فقط. |
| F-04 | High | Confirmed security/audit defect | migration 0016 كان يحمي `audit-log` و`audit`. migration `0017_realtime_and_bounded_log_hardening.sql` يستبدل القائمة ويحذف الاثنين مع `command-log`. لا توجد حماية بديلة لهما. | staff موثق يمكنه تعديل/حذف audit داخل snapshot عبر request مصاغ؛ التحقيق والمساءلة غير موثوقين. | Audit, authorization, migrations | migration جديدة تعيد append-only للـ audit مع سياسة bounded منفصلة للـ command log فقط. أضف PostgreSQL integration test يحاول حذف/تعديل audit كـ staff. |
| F-05 | High | Confirmed security boundary weakness | `apply_showroom_snapshot` يتحقق من application/collections/size/revision وبعض containment/length فقط. لا يتحقق من schema لكل collection أو transition أو totals. staff يمكنه append object مصاغ إلى `payments`, `sales` أو `expenses` والحماية تعتبره append مشروعًا. | مستخدم داخلي موثق أو XSS مستقبلي يمكنه إدخال حركة مالية لا تمر بقواعد التطبيق؛ التقارير تتعامل معها كحقيقة. | Server authorization, finance, data integrity | في المدى القصير validate changed collections والحقول والمعاني داخل RPC. المسار الآمن طويلًا: command-specific RPCs للمال والحالات بدل قبول full client snapshot. هذا يحتاج موافقة مالك قبل تغيير معماري واسع. |
| F-06 | High | Probable reliability/data-loss risk | كل command يرسل snapshot كاملًا؛ RPC يرفض فوق `20 MiB`. condition photos تبقى data URLs داخل records، وcatalogue upload قد يبقى base64 إذا فشل best-effort upload. لا يوجد gauge لحجم cloud snapshot. | عند بلوغ الحد تتوقف كل عمليات المعرض، حتى الصغيرة؛ احتمال outage تشغيلي وفشل حفظ أمام العميلة. | Persistence, images, performance, operations | اعرض حجم snapshot وتحذير مبكر، ضع حدًا للصور بعد الضغط، وانقل condition photos إلى private Storage مع references قبل الاقتراب من الحد. |
| F-07 | High | Probable operations/data-loss risk | النسخة الحالية تُنزّل إلى جهاز المستخدم فقط (`backupExport.service.ts`). bucket `backups` موجود بلا upload runtime. لا توجد policy/runbook/CI لنسخ Supabase أو PITR أو restore drill. | فقد الحساب/المشروع/الجهاز أو snapshot corrupt قد يفقد بيانات المعرض كاملة. | Backups, Supabase, DR | بموافقة المالك: فعّل backup/PITR المناسب، حدد retention والمسؤول، ونفذ restore drill على مشروع غير إنتاجي. |
| F-08 | Medium | Confirmed defect | `AddDressModal.tsx` يحتفظ بـ `images` state. effect عند الفتح و`closeModal` يعيدان form/error فقط ولا ينفذان `setImages([])`. | صور القطعة السابقة تظهر عند فتح إضافة قطعة جديدة وقد تحفظ مع عميلة/قطعة خاطئة؛ خطأ خصوصية وبيانات. | Inventory, forms, images | `setImages([])` عند فتح/إغلاق modal، واختبار reopen. |
| F-09 | Medium | Confirmed audit persistence defect | `exportBackupForDownload` يستدعي `recordAudit` مباشرة بعد download، خارج `runCommand`. حدث close التقط snapshot قبل audit، ولا ينشر export audit حدث cloud مستقل. | سجل إنشاء النسخة يبقى محليًا فقط حتى أمر لاحق، ويضيع عند reload/hydration قبل ذلك؛ ادعاء audit ليس مضمونًا. | Backup, audit, cloud sync | اجعل export audit command مع server acknowledgment، أو سجله في server منفصل بعد نجاح download. اختبر reload مباشرة بعد export. |
| F-10 | Medium | Confirmed product/role gap | migration 0011 يجعل أول حساب admin وactive، وكل حساب لاحق `staff` و`is_active=false`. لا توجد UI لإدارة profiles؛ `AccountSettings.tsx` يعرض الحساب والخروج فقط. | لا يمكن للمالك تفعيل موظفة أو تغيير دورها من المنتج؛ onboarding يعتمد على Supabase dashboard/SQL غير موثق. | Account lifecycle, admin UX, operations | أضف runbook آمن فوريًا، ثم شاشة admin محدودة للتفعيل/التعطيل والدور بعد server authorization. |
| F-11 | Medium | Confirmed permission/UX inconsistency | UI تسمح للـ staff بمحاولات يقل فيها طول collections، مثل hard delete غير المرجعي، بينما RPC يمنع staff من تقليل `customers`, `dresses`, وغيرها. الرفض يحصل بعد success محلي. | أزرار تبدو صالحة ثم توقف التشغيل مؤقتًا وتعيد البيانات؛ ارتباك وفقد ثقة. | Inventory/customers, roles, cloud UX | أخفِ/عطّل delete للـ staff أو اجعله admin-only بوضوح، مع server error mapping قبل optimistic success. |
| F-12 | Medium | Confirmed testing gap / false confidence | `tests/cloud-source-of-truth.test.mjs`, `daily-close-backup.test.mjs` وauth migration tests تستخدم regex/source assertions. E2E يعترض Auth/REST/Realtime بالكامل. لا test يشغل migrations وRPC على PostgreSQL/Supabase محلي فعلي. | CI الأخضر لم يكتشف F-03/F-04/F-05 أو queue behavior؛ خطر ثقة زائفة. | QA, CI, database | أضف Supabase/Postgres integration job يطبق migrations ويختبر anon/staff/admin وRPC conflicts، واختبار browser لا يعترض backend بالكامل في بيئة test. |
| F-13 | Medium | Confirmed privacy risk | `CloudDataGate` يستورد snapshot الخاص كاملًا إلى `localStorage`; `signOut` لا يمسح cache. PIN يحمي الواجهة لكنه لا يشفر storage ولا يمنع فحصه من نفس browser profile. | بيانات العملاء والمال تبقى على جهاز مشترك أو مسروق بعد logout. | Privacy, auth, local cache | قرر سياسة الجهاز. الخيار الأصغر: clear operational cache بعد signout فقط، ثم rehydrate بعد login؛ اختبر ألا يمس PIN. إذا احتجتم offline display لاحقًا فالتشفير قرار منفصل. |
| F-14 | Medium | Confirmed performance/reliability issue | `ConditionPhotoCapture` يقبل `image/*` بلا حد bytes، ثم `FileReader` و`Image` وcanvas على main thread. catalogue uploader يحد الملف 12 MiB لكن condition capture لا يفعل. | صورة كبيرة جدًا قد تجمد أو تسقط tab على هاتف متوسط قبل الضغط. | Mobile, camera, images | حد input bytes قبل القراءة، ورسالة عربية، واختبار ملف oversized. لاحقًا يمكن worker عندما تدعمه الأجهزة المستهدفة. |
| F-15 | Medium | Confirmed accessibility/touch defect | زر حذف صورة المخزون في `ImageUpload.tsx` يبدأ `opacity-0` ولا يظهر إلا `group-hover`; لا `focus-visible:opacity-100` ولا `aria-label`. | مستخدمة touch أو keyboard لا ترى طريقة حذف الصورة، والقارئ يسمع زرًا بلا اسم واضح. | Inventory form, accessibility | اجعل الزر ظاهرًا على touch، وأضف `aria-label`, و`focus-visible:opacity-100`. |
| F-16 | Medium | Confirmed product-model inconsistency | `AddDressModal` يسمح `itemType='accessory'` داخل `dresses`, وفي الوقت نفسه يوجد نظام مستقل `src/features/accessories` وcollection `accessories` مع barcode/reservation lifecycle مختلف. | قد يسجل نفس النوع في مكانين، ويظهر في تقارير/توافر مختلف، ما يربك الموظفات ويقسم التاريخ. | Product model, inventory, reports | حدد rule واحد: الملحق القابل للإرفاق يسجل في Accessories، أو وحّد النموذج. أولًا غيّر copy/options فقط بعد موافقة المالك على تعريف المنتج. |
| F-17 | Medium | Confirmed deployment/operations gap | لا `supabase/config.toml` ولا migration script في `package.json` ولا deploy/rollback workflow. Vercel deployment integration خارج repo، وآخر Production deployment ظاهر عبر GitHub كان أقدم من commit الحالي. | لا يمكن إعادة بناء deployment أو إثبات schema/version/rollback من المستودع وحده. | Release engineering, migrations, rollback | وثق وأتمت dev/staging migration plan، frontend release identity، smoke check وrollback. أي production action يتطلب موافقة. |
| F-18 | Medium | Confirmed performance debt | build ينتج initial `index` 317.05 kB (88.46 gzip), `vendor-react` 180.95 kB، ZXing 444.19 kB lazy chunk، وPWA precache 138 entry/2.77 MiB. تُشحن نسخ `woff` و`woff2` لخمسة أوزان وعدة subsets. | install/update أبطأ وcache أكبر على شبكة/هاتف ضعيف؛ ليس outage حاليًا. | Bundle, fonts, PWA | budget في CI، تحقق أن `woff` fallback مطلوب فعلًا، قلل subsets/weights، وأبق ZXing lazy. |
| F-19 | Low | Confirmed code-health debt | `reservation.service.ts` 1083 lines، `CreateReservationModal.tsx` 603، workflow ملف reservation يبدأ `eslint-disable ... no-explicit-any`, وطبقات compatibility/Tauri/mock باقية. | تكلفة تغيير أعلى واحتمال regressions؛ لا يثبت defect وحده. | Maintainability | بعد blockers: تقسيم bounded دون تغيير سلوك، إزالة suppression، وحصر/deprecate compatibility exports باختبارات. |
| F-20 | Low | Recommendation | لا axe/Lighthouse/screen-reader automated gate. الاختبارات الحالية تفحص classes/labels source بدرجة كبيرة. | أخطاء وصول حقيقية قد تمر رغم assertions النصية. | Accessibility QA | أضف `axe` لصفحات أساسية، keyboard journey، وتحقق قارئ شاشة على جهاز واحد. |

## 5. تحليل تفصيلي حسب المجال

### 5.1 اكتمال المنتج

**الموجود والمترابط:**

- 24 وجهة تشمل العام والدخول والعمليات.
- مخزون وتصاميم وvariants وaccessories منفصلة.
- عملاء وقياسات وسلوك ومواعيد وانتظار وتذكير.
- حجوزات متعددة البنود، availability/calendar، عقد، delivery/return/service.
- مبيعات وفواتير ومرتجعات، دفعات وتأمينات ومصروفات وإقفال وتقارير.
- backup/import/reset وPIN وطباعة وCSV وPWA.

**النواقص المادية:**

- account provisioning/activation/password reset ليست رحلة منتج مكتملة (F-10).
- role behavior غير متسق مع controls المرئية (F-03/F-11).
- no multi-tenant مقصود وليس defect؛ النظام يشترك في `showroom_state/main` لمعرض واحد.
- لا دفع إلكتروني، email automated، WhatsApp API، webhooks، queues أو cron؛ لا يوجد requirement مثبت لها، لذلك لم تُسجل كعيوب.

### 5.2 الصحة، retries والتزامن

نقاط قوية:

- local snapshot rollback واختبارات forced failure واسعة.
- command log وidempotency keys في معظم modals.
- optimistic revision يمنع last-write-wins بين جهازين.
- UI تضبط `data-cloud-commit=pending` فتوقف pointer events داخل main/nav أثناء commit.

نقاط خطرة:

- idempotency bug في reservation modal (F-01).
- atomicity المحلية ليست atomicity end-to-end لأن caller لا ينتظر server commit (F-02).
- queued stale snapshots لا تُلغى جماعيًا بعد failure.
- نجاح UI قد يظهر قبل server authorization، خصوصًا staff actions.
- async image side effect يبدأ داخل `addDress` بـ `void syncCreatedDressBestEffort`, خارج نتيجة command الأولى؛ قد يرفع orphan object أو ينشر أمرًا ثانيًا بعد rollback.

### 5.3 صحة الكود

- aliases وarchitecture tests موجودة، لكن target `src/modules/` غير مطبق؛ التنفيذ تحت `features`.
- الخدمات تكتب collections مباشرة، ويجمعها command layer؛ discipline تعتمد على caller ولا يفرضها type system.
- mock files وdesktop compatibility وdelegates باقية. ليست كلها dead code؛ بعض الاختبارات أو demo records تستخدمها. إزالة عمياء غير آمنة.
- `ImageGallery.tsx` لا يظهر له caller فعلي في source الحالي؛ dead-code candidate فقط، وليس finding وظيفي.
- `supabaseSync.ts` compatibility helper يستخدم في test فقط تقريبًا.
- لا unsafe dynamic evaluation أو `dangerouslySetInnerHTML` في runtime وجدها البحث. مسارات الطباعة/CSV لها escaping tests.

### 5.4 البيانات

نقاط قوية:

- RLS، forced RLS للجداول الجديدة، search path مقفل، revision row lock.
- constraints للـ legacy normalized tables على التواريخ والتأمينات وFKs/indexes.
- catalog projection العام منفصل عن snapshot الخاص.
- archive blockers وretired codes واختبارات identity.

مخاطر:

- مصدر الحقيقة JSON واحد؛ normalized tables لا تتزامن مع كل command.
- لا schema constraints داخل JSON لكل entity.
- لا tenant boundary؛ مقصود لمعرض واحد، لكن كل active user يرى snapshot الخاص كاملًا.
- `showroom_mutations` ينمو بلا retention job ظاهر.
- `client_error_events` ينمو بلا retention policy ظاهرة.
- admin غير مقيد بقيود staff داخل RPC ويمكنه استبدال/حذف snapshot؛ هذا يجعل حماية admin/MFA/backups حاسمة.
- deletion semantics في app جيدة نسبيًا، لكن server يعبر عنها بطول array فقط؛ تغيير ID أو duplicate shape لا يثبت semantic integrity.

### 5.5 الأمن والخصوصية

#### ما تم التحقق أنه جيد

- لم يُعثر على `service_role`, private key, live payment secret أو PAT داخل الملفات المتتبعة.
- الموجود في `.env.production` وWindows workflow هو browser publishable configuration؛ ليس secret، لكن أمانه يعتمد كليًا على RLS.
- public route يستخدم `catalogue_items` الضيق.
- CSP تقيد scripts/frames/connects، React يهرب النصوص، وروابط `_blank` تستخدم `noopener noreferrer` في الصفحة العامة.
- open redirect محمي بـ `getSafeReturnPath`.
- CSRF التقليدي منخفض التطبيق لأن Supabase يستخدم bearer token/API calls وليس cookie-auth form server. الخطر الأهم XSS/token theft، ولم يوجد XSS sink واضح في الفحص.
- لا SSRF backend؛ لا backend fetch يأخذ URL من المستخدم.
- لا webhooks أو CORS server code داخل repo لمراجعته.
- client observability لا يرسل stack أو payload؛ يرسل category/code/route/version فقط.

#### ما يحتاج معالجة

- server trusts client business effects (F-05).
- audit mutable (F-04).
- cache الخاص مستمر بعد logout (F-13).
- PIN بلا rate-limit/lockout؛ verifier PBKDF2 قوي نسبيًا، لكن ستة أرقام تبقى مساحة محدودة. سجل كخطر منخفض/قرار policy، لا defect exploitable عن بعد.
- لا MFA/policy evidence لأن إعدادات Supabase dashboard خارج repo.
- catalogue Storage bucket عام intentionally؛ الصور المرفوعة تبقى عامة لمن يعرف URL، والحذف best-effort ولا توجد orphan cleanup.

### 5.6 الاختبارات وCI

نتيجة الاختبارات كبيرة ومفيدة، خصوصًا business services والمال والrollback. لكنها مزيج من:

- تنفيذ services في Node مع fake/local storage؛
- source-code regex assertions؛
- migration text assertions؛
- E2E mocked network.

لا يوجد:

- component test يحافظ على React state بين إغلاق/فتح modal؛ لذلك فات F-01 وF-08.
- execution حقيقي لـ `apply_showroom_snapshot` كـ anon/staff/admin.
- test لفشل أول cloud commit مع ثاني queued.
- test لstaff reopen day.
- live deployment smoke في workflow رغم ادعاء README.
- coverage threshold أو mutation testing.

CI نفسه جيد من حيث ترتيب `npm ci`/test/type/lint/build/Playwright. latest GitHub Verify ظهر ناجحًا، لكن local E2E الحالي تعذر لغياب browser executable.

### 5.7 UX/UI والوصول

نقاط قوية:

- Arabic/RTL ثابت، Noto Arabic bundled، responsive shell، mobile bottom navigation.
- focus rings، modal focus trap، Escape، visual viewport، touch 16px، no horizontal page overflow.
- حالات empty/loading/error كثيرة ورسائل مالية عربية واضحة.
- update prompt لا يبدل التطبيق أثناء form مفتوح.

مشكلات:

- نجاح متفائل قبل server ack يضر الثقة أكثر من خطأ شكلي (F-02).
- controls لا تراعي role فعليًا دائمًا (F-03/F-11).
- image removal على touch/accessibility (F-15).
- duplicate inventory concepts (F-16).
- forms validation غير موحد؛ أربعة نماذج تستخدم Zod/RHF، والبقية HTML/state/service. ليس defect تلقائيًا لكنه يجعل رسائل الخطأ وسلوك submit متفاوتًا.

### 5.8 الأداء

- route splitting موجود، وZXing lazy.
- الصور تضغط sequentially لتجنب parallel memory spikes.
- لكن كل read يعيد JSON parse/clone لمجموعات، وكل command يصدر كامل snapshot ويعيد projection كامل catalog على الخادم.
- `apply_showroom_snapshot` يحذف كل `catalogue_items` ثم يعيد إدخالها في loop بعد كل command، حتى لو كانت العملية مجرد ملاحظة عميل أو دفعة.
- full snapshot + catalog rebuild = تكلفة تنمو مع كل بيانات المعرض، وليست مع حجم التغيير.
- main bundle وfonts/precache موثقة في F-18.
- لا N+1 HTTP تقليدي لأن المصدر snapshot واحد، لكن توجد loops وreads متكررة داخل services/reports قد تصبح quadratic مع نمو السجلات؛ لم تتوفر production dataset لقياسها.

### 5.9 PWA

متحقق من build:

- manifest عربي RTL standalone، icons 192/512/maskable.
- `generateSW`, navigation fallback، cache cleanup وprompt update.
- static shell/fonts precached؛ Supabase responses لا توجد لها runtime cache rule، وهذا جيد للبيانات الخاصة.
- التشغيل التشغيلي fail-closed عند عدم الوصول إلى cloud؛ لا offline writes.

غير متحقق:

- installability على جهاز حقيقي.
- update banner بعد deployment فعلي.
- offline reload على installed PWA.
- cache migration مع عدة versions.
- سلوك storage eviction على iOS.

### 5.10 التشغيل

- production build reproducible محليًا.
- Vercel headers جيدة، لكن release automation خارج repo.
- migrations لا تملك runner أو local Supabase config داخل repo.
- no monitoring/alerting؛ توجد error rows فقط.
- no documented recurring cost limits لـ Supabase storage/database/Realtime أو Vercel bandwidth.
- لا centralized backup/restore/rollback proof.
- Tauri خارج release الرسمي، لكن workflow Windows قديم ما زال موجودًا ويعمل على branch قديم؛ يزيد الالتباس التشغيلي.

## 6. نتائج الفحوص الأساسية الحالية

| الأمر | النتيجة | الملاحظة |
| --- | --- | --- |
| `git status --short --branch` | PASS discovery | branch صحيح؛ أربعة مستندات غير متتبعة سابقة محفوظة. |
| `npm test` | PASS | 63 invocation؛ **676 passed, 0 failed, 0 skipped**. |
| `npm run typecheck` | PASS | لا TypeScript errors. |
| `npm run lint` | PASS | لا ESLint errors. |
| `npm run build` | PASS | Vite 6.4.3؛ 2216 modules؛ PWA generated. |
| `npm audit --omit=dev` | PASS | 0 vulnerabilities. |
| `npm audit` | PASS | 0 vulnerabilities. |
| `npm ls --all` | PASS | tree صالح؛ optional platform packages غير المثبتة طبيعية. |
| `npm run test:e2e` | **تعذر بيئيًا** | build نجح، ثم 12/12 projects failed قبل بدء test لأن Playwright Chromium executable غير موجود. |
| `npx playwright install chromium` | **تعذر بيئيًا** | محاولات download السابقة في نفس workspace فشلت بـ `ECONNRESET` من CDN. |
| live Supabase REST probe | **غير متحقق** | TLS أغلق قبل HTTP؛ لم تُقرأ بيانات. |
| Tauri native build | **غير متحقق** | `rustc` و`cargo` غير مثبتين، وTauri خارج release الرسمي. |

### أرقام البناء المهمة

- PWA precache: 138 entries، حوالي 2773.81 KiB.
- `index` الرئيسي: 317.05 kB / 88.46 kB gzip.
- `vendor-react`: 180.95 kB / 59.60 kB gzip.
- `vendor-zxing`: 444.19 kB / 112.87 kB gzip، lazy.
- CSS: 70.64 kB / 11.07 kB gzip.
- npm install السابق في workspace أظهر `EBADENGINE` لأن `@zxing/library@0.22.0` يعلن Node >=24 بينما المشروع/CI Node 22؛ build/tests نجحت، لكن camera runtime يحتاج جهازًا حقيقيًا.

## 7. خارطة المعالجة ذات الأولوية

### Milestone 1 — إصلاحات صغيرة توقف الأعطال الواضحة

**لا تحتاج تغييرًا معماريًا واسعًا، وهي البداية الأكثر أمانًا:**

1. F-01: تجديد reservation submission key عند كل فتح، واختبار حجزين متتاليين.
2. F-08: تصفير صور Add Dress عند الفتح/الإغلاق، واختبار reopen.
3. F-15: جعل حذف الصورة مرئيًا ومسمى على touch/keyboard.
4. F-14: حد bytes لصور condition قبل decode.
5. F-03/F-11: مواءمة controls مع role الحالي مؤقتًا؛ على الأقل اجعل reopen/delete admin-only بوضوح حتى يقرر نموذج الصلاحية النهائي.

**بوابة الخروج:** unit/component tests جديدة + full baseline green + Playwright عند توفر browser.

### Milestone 2 — سلامة cloud والصلاحيات

1. F-02: server acknowledgment حقيقي، وإلغاء queue بعد failure.
2. F-04: migration تعيد audit append-only مع test Postgres فعلي.
3. F-05: server-side validation للـ changed collections والحركات المالية.
4. integration harness يطبق migrations ويختبر anon/staff/admin/conflict/idempotency.
5. F-09: audit النسخ يلتزم cloud قبل ادعاء النجاح.

**بوابة الخروج:** لا optimistic false success؛ staff cannot alter audit/forge invalid ledger؛ tests تنفذ PostgreSQL لا تقرأ SQL فقط.

### Milestone 3 — حماية البيانات والتشغيل

1. قياس snapshot production بأمان وdashboard للحد.
2. نقل condition photos خارج JSON أو وضع استراتيجية bounded واضحة.
3. server backup/PITR + retention + restore drill.
4. migration/deploy/rollback runbook وstaging environment.
5. alerts لحجم snapshot، failed commits، error events ونمو mutation log.

**بوابة الخروج:** restore مثبت على بيئة غير إنتاجية، وحدود quota معروفة، وrollback موثق.

### Milestone 4 — الحسابات، الخصوصية وتجربة الأجهزة

1. account activation/admin management أو runbook رسمي.
2. سياسة clear cache عند logout ومراجعة PIN/MFA.
3. real-device PWA/camera/printing/CSV/WhatsApp checks.
4. axe + keyboard + screen-reader pass.
5. performance budget وfont/bundle cleanup.

### Milestone 5 — صحة الكود بعد الاستقرار

- تقسيم reservation service/modal.
- إزالة `any` suppression.
- حسم نموذج accessories المزدوج بموافقة المالك.
- عزل أو إزالة Tauri/compatibility/dead candidates بعد إثبات عدم وجود مستخدمين تاريخيين.
- تحديث الوثائق المتناقضة.

## 8. عناصر تحتاج موافقة المالك

لا يجب تنفيذها ضمن إصلاحات صغيرة دون قرار:

1. تغيير source-of-truth من full snapshot إلى command-specific/normalized writes.
2. نقل condition photos إلى Supabase Storage، لما له من تكلفة وprivacy/retention أثر.
3. تفعيل خطة Supabase مدفوعة أو PITR/backup مدفوع.
4. أي migration على production أو تعديل RLS/RPC الحي.
5. clear cache عند logout إذا كان هناك توقع بأن البيانات تظل محليًا لدعم recovery.
6. تعريف من يملك حق reopen/delete/reset/import: admin فقط أم staff بشروط.
7. توحيد accessories مع generic inventory؛ قرار product/data migration.
8. حذف Tauri أو تصميم upgrade path لمستخدمين تاريخيين.
9. نشر public deployment أو rollback production.
10. سياسات الحسابات، MFA، retention ومدة الاحتفاظ بصور الحالة/audit/errors.

## 9. مناطق لم يمكن التحقق منها

| المنطقة | لماذا لم تتحقق؟ | ما الدليل المطلوب؟ |
| --- | --- | --- |
| Supabase schema/RLS الحي | TLS فشل قبل HTTP، ولا credentials إدارية مطلوبة/مستخدمة. | schema dump آمن أو integration project يطبق migrations، ثم role tests. |
| رحلة إنتاج كاملة | لا حساب test/backend حي قابل للفحص دون مخاطرة ببيانات حقيقية. | staging seed غير حساس ورحلة كاملة مع server assertions. |
| Current Vercel deployment | integration خارج repo، وسجل GitHub الظاهر قديم. | production URL + build SHA endpoint أو deployment metadata. |
| Backup/PITR settings | موجودة في Supabase dashboard لا repo. | owner-approved screenshot/config export دون secrets + restore drill. |
| Playwright journeys محليًا | Chromium executable غائب وتنزيله فشل شبكيًا. | `npx playwright install chromium` ثم `npm run test:e2e`. |
| Camera/barcode | يحتاج hardware/permissions. | grant/deny/manual fallback على الجهاز الفعلي. |
| PWA install/offline/update | يحتاج browser/device وdeploymentين. | install، offline reload، deploy جديد، prompt ثم reload. |
| Printing/labels/CSV Arabic | يحتاج printer/labels/accountant device. | عقد وفاتورة و10 labels وCSV على الأدوات الفعلية. |
| Tauri Windows | Rust/Windows toolchain غير موجود، والمنتج خارج scope الرسمي. | فقط إذا وافق المالك على استمراره: Windows build/install/relaunch. |
| أحجام production ومعدل النمو | لا وصول إلى snapshot حي أو بيانات خاصة. | metrics فقط: bytes/counts دون تنزيل بيانات حساسة. |
| MFA/Auth dashboard/CORS URLs | إعداد خارجي. | مراجعة owner-approved لـ Supabase Auth settings. |

## 10. ملاحظات لا تُعد عيوبًا مؤكدة

- publishable Supabase key في frontend ليس secret بطبيعته؛ لا يُعامل كتسريب credential خاص.
- عدم وجود CSRF token ليس عيبًا تلقائيًا هنا لأن المصادقة API bearer وليست server cookie form.
- عدم وجود SaaS/multi-tenancy/payment gateway/AI/maps ليس نقصًا دون requirement.
- Tauri build غير ناجح محليًا لا يعني أن Web/PWA فاشل؛ Tauri خارج surface الرسمي.
- حجم bundle ليس Critical وحده؛ سجل Medium لأنه يؤثر على أجهزة ضعيفة ويحتاج budget.
- 676 test نتيجة قوية، لكنها لا تثبت backend/deployment/device بسبب نوع التغطية.

## 11. الخلاصة المختصرة: أهم خمس نتائج

1. **High:** إنشاء الحجز الثاني من نفس الصفحة يفشل بسبب إعادة استخدام `submissionKey`.
2. **High:** نجاح العمليات يظهر قبل تأكيد Supabase، وqueue failure يمكن أن يعيد snapshot مرفوضًا.
3. **High:** staff لا تستطيع عمليًا إعادة فتح اليومية رغم ظهور الزر لها.
4. **High:** migration 0017 جعلت audit قابلًا للتغيير بواسطة staff داخل snapshot.
5. **High:** RPC يقبل full client snapshot ولا يطبق قواعد العمل المالية كاملة على الخادم.

### أسلم خطوة أولى

ابدأ بـ **Milestone 1 فقط**: أصلح مفتاح الحجز، تصفير الصور، وصول زر حذف الصورة، حد صور condition، ومواءمة أزرار staff مع الصلاحيات الحالية. هذه إصلاحات صغيرة وقابلة للعكس، ولا تتطلب migration production أو تغيير architecture. بعد ذلك انتقل إلى Milestone 2 في فرع منفصل وبـ PostgreSQL integration tests قبل أي نشر.
