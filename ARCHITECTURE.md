# معمارية LENA المتحققة

> آخر تحقق: 2026-08-17. هذا المستند يصف الكود الحالي، لا المعمارية المتمنّاة فقط.

## 1. الصورة العامة

```text
Browser / installed PWA
  ├─ Public /landing ──REST anon──> Supabase catalogue_items
  └─ Authenticated app
       ├─ Supabase Auth + profiles
       ├─ CloudDataGate: fetch showroom_state snapshot
       ├─ localStorage/IndexedDB: non-authoritative working cache
       ├─ feature services + workflow command
       ├─ complete before/after snapshot
       └─ RPC apply_showroom_snapshot(expected revision, idempotency key)
             ├─ one PostgreSQL transaction
             ├─ optimistic concurrency
             ├─ server authorization/append-only checks
             ├─ update showroom_state revision
             ├─ rebuild narrow public catalogue_items
             └─ append showroom_mutations
```

**الحقيقة الحالية:** البيانات التشغيلية الرسمية ليست rows normalized لكل feature. مصدر الحقيقة الفعلي هو JSON snapshot واحد في `public.showroom_state`, `id='main'`. الجداول القديمة normalized باقية للتوافق/الانتقال، لكن التطبيق الرسمي يقرأ ويكتب snapshot المركزي.

## 2. بنية المستودع والأدوات

- مستودع واحد، وليس monorepo؛ `package.json` واحد و`package-lock.json` واحد.
- package manager المؤكد: npm (`npm ci`).
- Node: `>=22 <25`; CI يستخدم Node 22.
- التقنية: React 18.3، TypeScript 5.7، Vite 6، React Router 7، Tailwind 3، Supabase JS 2، PWA/Workbox، Zod وReact Hook Form، ZXing وJsBarcode.
- `src-tauri/` مشروع Rust/Tauri 2 منفصل داخل نفس المستودع، لكنه خارج سطح الإصدار الرسمي.
- لا يوجد Graphify output في checkout؛ استُخدم الفحص المباشر كما يسمح `AGENTS.md`.

### طبقات الكود الفعلية

| المسار | المسؤولية الحالية |
| --- | --- |
| `src/app/` | bootstrap routing وshell والحماية والتنقل. |
| `src/features/` | الوحدات الرأسية الفعلية: UI، types، services، workflows. هذا هو الجذر الأساسي الحالي، رغم أن وثيقة الهدف تسمي `modules/`. |
| `src/engines/persistence/` | registry، local cache، النسخ، migrations، transactions، IDs/counters. |
| `src/engines/workflows/` | command runner والذرية وidempotency log. |
| `src/platform/` | browser storage/images/printing/download/WhatsApp/PIN/PWA update، وجزيرة desktop المعزولة. |
| `src/shared/` | قواعد domain وutilities وعقود persistence. |
| `src/components/shared/` | عناصر UI مشتركة. |
| `src/pages/landing/` | الصفحة العامة ومستودع الإسقاط العام. |
| `src/services/` | compatibility delegates قديمة، وليست الملكية المستهدفة. |

**تناقض مسجل:** `TARGET_CODE_ARCHITECTURE.md` وaliases يعرّفان `src/modules/`، لكن هذا المجلد غير موجود؛ التنفيذ ما زال تحت `src/features/`. اختبارات boundaries تحمي الجذور الموجودة ولا تعني أن migration المستهدفة اكتملت.

## 3. بدء التطبيق وتدفق البيانات

1. `src/main.tsx` يسجل PWA update handler وclient observability.
2. يركب `BrowserRouter` ثم `AuthProvider` ثم `AppRoutes`.
3. المسارات التشغيلية تمر عبر:
   - `RequireAuth`؛
   - `CloudDataGate`؛
   - `AppShell` (لا توجد طبقة قفل جهاز: الدخول بحساب المديرة/الموظفة هو البوابة الوحيدة).
4. `CloudDataGate` يجلب `showroom_state`, يتحقق من `applicationId` وشكل collections، ثم يستورده إلى cache من مفاتيح `dress-roomshow:*`.
5. feature services تقرأ/تكتب هذه collections المتسلسلة كـ arrays.
6. `runCommand` يأخذ snapshot قبل العملية، ينفذ كل writes محليًا كمعاملة قابلة للrollback، ويضيف command log عند وجود idempotency key.
7. بعد النجاح يطلق event يحمل `before` و`after`.
8. `CloudDataGate` يرسل `after` إلى RPC `apply_showroom_snapshot` مع revision متوقع. commits داخل الصفحة تصطف في Promise queue.
9. عند فشل commit: يعيد `before` محليًا، يقفل الواجهة، ثم يعيد hydration من الخادم.
10. عند update من جهاز آخر عبر Supabase Realtime: يعيد hydration إن لم يكن الجهاز في commit محلي.

### حدود الذرية والتزامن

- داخل المتصفح: snapshot rollback عبر persistence engine.
- على الخادم: RPC واحد مع row lock وrevision increment.
- التكرار: `(actor_id, idempotency_key)` primary key في `showroom_mutations`.
- conflict: revision mismatch يعطي `LENA_REVISION_CONFLICT` ويجبر إعادة التحميل؛ لا يوجد merge على مستوى record.
- حد snapshot في RPC: 20 MiB نص JSON.
- `command-log` المحلي bounded إلى 500؛ migration 0017 أخرج audit/command log من server append-only comparison لتقبل trimming المشروع، مع بقاء ledgers المالية محمية.

## 4. قاعدة البيانات

### مصدر الحقيقة الرسمي

| الجدول | الغرض والحدود |
| --- | --- |
| `showroom_state` | row واحد فقط `main`; JSON snapshot + revision + updater. RLS وقراءة للحساب الفعال فقط. |
| `showroom_mutations` | سجل idempotency/revision لكل actor؛ قراءة admin فقط، وإدخال عبر RPC. `actor_id` لا يحذف (`ON DELETE RESTRICT`). |
| `catalogue_items` | إسقاط عام ضيق يعاد بناؤه بعد كل snapshot commit؛ anon يرى `status='available'` فقط. |
| `client_error_events` | أخطاء متصفح مختصرة: category/code/route/version، دون stack أو payload؛ insert للحساب الفعال وقراءة admin. |
| `profiles` | يربط Supabase Auth بـ `admin`/`staff` و`is_active`. حذف Auth user يحذف profile cascade. |

### جداول التوافق normalized

`dresses`, `dress_images`, `customers`, `reservations`, `payments`, `returns`, `expenses` أُنشئت في migrations 0002–0005، مع:

- unique: dress code، customer phone، reservation number، return per reservation؛
- FKs: reservation إلى customer/dress بـ `ON DELETE RESTRICT`، images إلى dress بـ cascade، profile references غالبًا set null أو default no action؛
- checks: dates، statuses، non-negative canonical deposit fields، liability `refunded + retained <= collected`؛
- indexes على reservation customer/dress/dates، FK columns، payment idempotency، cancellation/classification actor، وأعمدة الحالة الجديدة؛
- triggers legacy لمنع overlap وتحديث totals؛
- RLS active-user policies، admin-only deletes، وpayments insert/select فقط.

**حد مهم:** التطبيق الرسمي لا يحدث هذه الجداول normalized عند كل command؛ migration 0016 يسميها compatibility tables. لذلك لا يجوز اعتبارها نسخة موازية مضمونة التطابق مع `showroom_state` بعد الانتقال.

### collections داخل snapshot

الـ registry يضم 30 مجموعة:

`customers`, `dresses`, `dress-designs`, `accessories`, `reservation-accessories`, `reservations`, `appointments`, `payments`, `expenses`, `delivery-return`, `sales`, `sales-invoices`, `sale-returns`, `service-tasks`, `audit-log`, `audit`, `daily-closings`, `counters`, `command-log`, `reminder-dismissals`, `operators`, `customer-conduct-notes`, `waitlist`, `print-settings`, `retired-codes`, `preferences`, `showroom-profile`, `stocktake-sessions`, `message-templates`, `images`.

الصور الكبيرة يمكن أن تكون في IndexedDB أو Supabase Storage؛ snapshot cloud يحذف `imageBlobs`, بينما صور catalogue المحفوظة كرابط تبقى في records. صور condition الحالية تُحفظ data URLs داخل record حسب الكود، ما يضغط حد 20 MiB.

### الحذف والملكية/tenancy

- لا يوجد `tenant_id` ولا showroom ownership؛ كل active profiles يصلون إلى `main`. الفصل بين tenants غير موجود تصميميًا.
- app services تمنع hard delete لعميل/قطعة لها مراجع وتستخدم archive/inactive.
- staff لا يستطيع تقليل طول collections الرئيسية عبر RPC؛ admin يستطيع، لذا حماية admin وعمليات التصفير شديدة الأهمية.
- ledgers السابقة لا يمكن أن تختفي من snapshot staff لأن array containment مطلوب؛ admin ليس مقيدًا بنفس server comparison.

### seed/migrations

- 18 migration files؛ `0001` placeholder فقط.
- migration 0016 تحول rows الموجودة مرة واحدة إلى initial snapshot وتترك بقية collections فارغة. تعليقها يقول إن rows الموجودة وقتها كانت test data، لكن لا توجد seed command تلقائية في runtime.
- production first-run يفترض snapshot `main` موجودًا؛ عدم وجوده يجعل `CloudDataGate` يفشل مغلقًا. إنشاء المشروع من migrations هو مسار bootstrap المتاح.
- demo data موجود في code ولا يحمّل إلا بطلب صريح؛ لم أجد زرًا ظاهرًا له في route inventory الحالي، لذلك استعماله التشغيلي غير محسوم.

## 5. المصادقة والتفويض

### Auth/session

- Supabase email/password عبر `signInWithPassword`.
- session يديرها Supabase client في المتصفح و`onAuthStateChange`.
- `fetchProfile` يحول أي role غير `admin` إلى `staff` دفاعيًا.
- حالات: loading, signed-out, signed-in, disabled, profile-missing, auth-error.
- لا password reset/signup/account invitation UI متحقق.

### server authorization

- `private.is_active_lena_user()` و`private.is_lena_admin()` مبنيتان على `auth.uid()` وprofile.
- RLS مفعل، ومفروض `FORCE RLS` على الجداول المركزية الجديدة.
- RPC `SECURITY DEFINER` يستخدم `search_path=''`, يتحقق من actor، snapshot، الأحجام، command identity، revision والصلاحيات.
- staff: لا يغير إعدادات؛ لا يحذف customers/dresses/reservations/accessories/appointments/service tasks؛ لا يزيل rows مالية سابقة.
- admin UI gate ليس الحد الوحيد؛ server يعيد فحص الدور في RPC.

### PIN الجهاز

- طبقة ثانية بعد الحساب وليست بديلًا للمصادقة.
- localStorage key خارج prefix التشغيل، كي لا تنقله backup ولا يمسحه data reset.
- PBKDF2-SHA256، 210,000 iterations، salt 16 bytes، verifier 32 bytes.
- لا rate limiting أو lockout محلي في الكود؛ الحماية تعتمد على كلفة PBKDF2 وعلى possession of device.

## 6. التكاملات الخارجية

| التكامل | الاستخدام |
| --- | --- |
| Supabase Auth | الجلسات والحسابات. |
| Supabase PostgreSQL/PostgREST/RPC/Realtime | snapshot المركزي، profile، public catalogue، conflict notification والأخطاء. |
| Supabase Storage | buckets: `catalogue-images` عام بالروابط، `condition-photos` و`backups` خاصان في schema. الكود الحالي يرفع catalogue images فقط؛ backup upload وcondition bucket ليسا موصولين كمسار runtime رسمي. |
| WhatsApp | `wa.me` deep links برسالة عربية معدة؛ إرسال يدوي. default country code 968. |
| Browser APIs | camera، clipboard، print iframe overlay، download Blob، IndexedDB، localStorage، Web Crypto، Storage Estimate، Service Worker. |
| Vercel | config للبناء، SPA rewrites وsecurity headers. لا workflow نشر داخل GitHub. |

لا Stripe/payment gateway، لا analytics SDK، لا AI، لا maps، لا SMTP/email provider، لا webhooks، لا queues أو cron.

## 7. PWA

- `vite-plugin-pwa`, strategy `generateSW`, update mode `prompt`.
- manifest: `name/short_name=LENA`, `lang=ar`, `dir=rtl`, `display=standalone`, theme/background `#651f34`.
- icons: 192 SVG، 512 SVG، maskable 512 SVG؛ favicon منفصل.
- Workbox precaches JS/CSS/HTML/SVG/fonts/images، `navigateFallback=index.html`, `cleanupOutdatedCaches=true`.
- shell وlogin يمكن إعادة تحميلهما offline بعد cache؛ `CloudDataGate` يمنع التشغيل الفعلي من دون الاتصال. لا offline outbox.
- update event يظهر banner؛ التطبيق لا يتبدل حتى ضغط المستخدم على reload.
- build المتحقق أنتج `sw.js`, Workbox bundle و138 precache entry (~2.77 MiB).

## 8. العرض والاستجابة والوصول

- RTL وArabic ثابتان من `index.html`; لا i18n framework.
- font محلي بوزن 400–800، ومشمول في precache.
- sidebar desktop + bottom nav mobile؛ responsive grids وsafe area.
- shared `Modal` يدير focus/escape/scroll، والطباعات داخل overlay قابل للإغلاق.
- contract tests تغطي labels، focus styles، 320px guards، tap targets، Arabic empty/loading/error states.
- لا فحص axe/Lighthouse مخصص ولا قارئ شاشة حقيقي متحقق؛ التغطية الحالية code-contract وPlaywright journeys فقط.

## 9. البناء والنشر والتشغيل

### CI

- `Build`: `npm ci` ثم `npm run build`.
- `Verify`: `npm ci`, `npm test`, typecheck, lint, build، تثبيت Chromium، ثم Playwright.
- workflows تعمل على PRs؛ push الرئيسي لـ `main` فقط.
- latest GitHub Build وVerify على commit الحالي `main` نجحا في 2026-08-17.

### Vercel

- `npm run build`, output `dist`, SPA rewrite.
- CSP يمنع object/frame ويقيد الاتصال إلى Supabase؛ camera self فقط؛ headers لـ nosniff/frame/referrer/COOP.
- سجل GitHub deployments الذي أمكن فحصه أظهر آخر Production deployment ظاهر بتاريخ 2026-07-28 عند commit أقدم، وليس commit الحالي. هل Vercel نشر current main خارج هذا السجل غير محسوم.

### المراقبة والنسخ والrollback

- client error events فقط؛ لا uptime monitor، tracing، metrics، alerts أو log aggregation موصولة في repo.
- audit business log داخل snapshot، وmutation log server-side.
- backup يدوي/بعد daily close ينزل إلى جهاز المستخدم؛ bucket `backups` موجود لكن لا upload code نشط.
- لا policy موثقة قابلة للتنفيذ لنسخ PostgreSQL/Supabase، retention، point-in-time recovery أو disaster restore.
- rollback للواجهة يتم عبر إعادة نشر build أقدم نظريًا؛ لا workflow أو runbook متحقق في repo لrollback Vercel/database migrations.

## 10. Tauri التاريخي

`src-tauri` يحتوي Tauri 2 + SQLite table واحدة `app_snapshot(key,value)`, وcommands لتحميل/حفظ localStorage snapshot. config يبني desktop 1.0.0. لكن:

- official Web dependency graph يمنع استيراده؛
- ADR 0001 يخرجه من نطاق الإصدار؛
- GitHub workflow `windows-release.yml` ما زال موجودًا ويعمل يدويًا أو على branch قديم `feature/supabase-auth` فقط؛
- Rust/Cargo غير مثبتين في بيئة الفحص، ولم يُنفذ native build.

هذا كود compatibility/dead-weight محتمل، وليس منتجًا رسميًا متحققًا.
