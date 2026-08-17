# حالة مشروع LENA

> Baseline discovery: 2026-08-17، commit `7930a9e5e9b4c200f5d6bdbbf9ca1d5edd0987f4`، branch `arena/01a00fc5-lenadress`.
>
> لم يتغير سلوك الإنتاج في هذه الجولة؛ التغييرات الوحيدة هي مستندات الاكتشاف الأربعة.

## 1. ملخص تنفيذي

الكود ليس prototype صغيرًا: يوجد تطبيق عربي واسع، 24 route ظاهرًا (عام/دخول/تشغيل)، 30 collection، 18 migration، و676 اختبار Node ناجح. المعمارية الرسمية أصبحت Web/PWA + Supabase snapshot مركزي، مع optimistic revision وidempotency وRLS. البنية المالية وrollback والنسخ لها اختبارات كثيرة.

لكن **الجاهزية الميدانية ليست مثبتة بالكامل**: لم تُنفذ في هذه البيئة رحلة حية بحساب إنتاج، ولم ينجح تنزيل Chromium محليًا لتشغيل Playwright، ولا توجد أدلة الجهاز الحقيقي للكاميرا والطباعة/PWA install والمقاسين، ولا خطة متحققة لنسخ Supabase/استعادته. كما أن الوثائق تحتوي بقايا قرارات قديمة متناقضة.

## 2. متحقق أنه يعمل

### الفحوص المحلية الحالية

- `npm ci`: نجح؛ 539 package؛ audit أثناء التثبيت = 0 vulnerabilities.
- `npm test`: نجح؛ 63 test invocation، **676/676 passed**, 0 failed, 0 skipped.
- `npm run typecheck`: نجح.
- `npm run lint`: نجح بلا رسائل.
- `npm run build`: نجح؛ 2,216 module؛ PWA أنتج 138 precache entry (~2.77 MiB), `sw.js` وWorkbox.
- `npm audit --omit=dev` و`npm audit`: كلاهما 0 vulnerabilities.
- Git بقي نظيفًا بعد التثبيت والبناء قبل إنشاء هذه المستندات؛ لم يتغير lockfile.

### ما تثبته الاختبارات الحالية

**متحقق آليًا، وليس بديلًا عن تشغيل إنتاج حي:** 

- حدود app/router/shell والابتعاد عن Tauri في Web build.
- persistence registry، migrations القديمة، backup/restore، images وexact rollback في سيناريوهات الاختبار.
- الذرية وforced failures عبر الحجوزات والمال والتسليم/الاسترجاع والمبيعات والمصروفات والإقفال والإدارة.
- الفصل المالي بين rental/booking advance/security deposit/refund/retention/fees، والتسويات والتقارير.
- IDs/codes والباركود والأرشفة وعدم إعادة استخدام الأكواد.
- conflict engine والتوفر والتقويم والحجوزات متعددة البنود والملحقات.
- service workflow، stocktake، late fee، condition evidence، daily dashboard، reminders/WhatsApp، waitlist، measurements.
- CSV/printing safeguards، PWA build contract، auth/RLS migration contract، cloud snapshot source-of-truth contract.
- RTL/mobile source contract، modal focus/overflow/labels/tap targets.

### CI الحالي

- GitHub `Build` و`Verify` على `main` عند commit الحالي ظهرا ناجحين بتاريخ 2026-08-17.
- لا توجد Pull Requests مفتوحة وقت الفحص.
- لا توجد release tags أو GitHub Releases ظاهرة.

## 3. فشل أو تعذر أثناء هذه الجولة

| الفحص | النتيجة | التصنيف |
| --- | --- | --- |
| `npx playwright install chromium` | فشل بعد عدة محاولات بـ `ECONNRESET` أثناء TLS إلى Playwright CDN. لذلك لم يبدأ `npm run test:e2e`. | عائق بيئة/شبكة حالي، لا يثبت فشل التطبيق. |
| الاتصال الآمن المباشر بـ Supabase public catalogue/private state | كلا الطلبين انتهيا بـ TLS EOF قبل استجابة HTTP. | عائق شبكة؛ لم يتم التحقق الحي من backend المنشور أو RLS الحالي. |
| `rustc --version`, `cargo --version` | الأداتان غير مثبتتين. | Tauri native build غير ممكن هنا. |
| `npx tauri --version` | لم يحدد executable بهذه الصيغة. | command غير صحيح لهذا package layout؛ المسار الموثق هو `npm run tauri -- ...`، لكن Rust مفقود على أي حال. |

**تحذيرات `npm ci`:**

- `@zxing/library@0.22.0` يعلن Node `>=24`, بينما المشروع وCI يستخدمان Node 22. التثبيت والبناء والاختبارات نجحت رغم `EBADENGINE`؛ compatibility runtime للماسح تحتاج تحقق جهاز/browser.
- npm طبع deprecation لـ transitive `glob@11.1.0`. audit الحالي صفر، لكنه دين dependency.

## 4. مناطق ناقصة أو غير مثبتة

### إطلاق وتشغيل حقيقي

1. لا يوجد walk-through كامل على backend حي: login → customer → reservation → payment/deposit → delivery → return → service → reports → close → backup/restore.
2. Playwright المحلي لم يعمل بسبب تنزيل المتصفح، رغم أن latest GitHub Verify نجح على نفس commit.
3. لا توثيق ميداني حديث للمقاسين 360×740 و390×844 لكل route.
4. لا تثبيت PWA حقيقي، offline reload على جهاز، أو تحقق banner update بعد نشر جديد.
5. لا camera permission/deny/manual fallback على جهاز حقيقي.
6. لا طباعة حقيقية للعقد/الفاتورة/دفعة الملصقات ولا فتح CSV العربي على جهاز المحاسب.
7. Tauri غير مدعوم رسميًا، وWindows workflow قديم غير مربوط بـ `main`; لا build/install/relaunch proof.

### تشغيل وبيانات

1. **Backups المركزية:** backup الحالي download إلى الجهاز فقط. bucket `backups` موجود لكن غير مستخدم. لا schedule server-side، retention، restore drill، PITR أو مسؤولية تشغيلية محددة.
2. **حجم snapshot:** RPC يرفض فوق 20 MiB. condition photos كـ data URL داخل records، والـ snapshot الكامل يكتب بعد كل command. لا monitoring لحجم snapshot ولا compaction plan متحقق.
3. **نمو `showroom_mutations`:** append دائمًا ولا توجد retention/archival job في repo.
4. **تزامن متعدد الأجهزة:** يعتمد على revision conflict وإعادة hydration، لا merge. هذا آمن ضد الكتابة فوق، لكنه قد يرفض عمل مشغلة ويجبر إعادة التنفيذ؛ لم يُختبر تشغيليًا تحت ضغط حقيقي.
5. **نشر current main:** GitHub deployments الظاهر أظهر Production قديمًا عن current main. لا deploy workflow في `.github`; حالة Vercel الحالية غير محسومة.
6. **قاعدة Supabase الحية:** لا يمكن إثبات أن migrations 0001–0018 مطبقة فعلًا من repo فقط، وفشل الاتصال الشبكي في هذه الجولة.
7. **الحسابات:** لا UI لإنشاء المستخدمين أو دعوتهم أو reset password أو تعطيل/ترقية account؛ العملية الإدارية الخارجية غير موثقة بوضوح.
8. **monitoring:** error rows محدودة داخل Supabase فقط؛ لا alerts، uptime، dashboards، server logs أو privacy/retention policy للأخطاء.
9. **rollback:** لا runbook متحقق لإرجاع frontend أو database migration، ولا automated rollback gate.

### جودة هندسية

1. `src/features/reservations/reservation.service.ts` (1083 lines) وملفات UI كبيرة؛ maintenance hotspots.
2. architecture migration غير مكتملة: `src/modules/` غير موجود، و`features`, `components`, `services` compatibility تعيش مع target aliases.
3. forms validation غير موحد: أربعة forms تستخدم Zod/RHF؛ البقية تحقق يدوي/HTML/service. هذا ليس فشلًا بذاته لكنه يزيد تفاوت UX والخطأ.
4. لا unit/component framework قياسي مثل Vitest/RTL؛ معظم الاختبارات Node source/service contracts، وبعضها يقرأ source text. لا coverage threshold.
5. لا axe/Lighthouse أو قارئ شاشة/device accessibility evidence.
6. migrations تحتوي تنظيفًا مشروطًا لأشياء من تطبيقات أخرى في 0015؛ يدل على shared Supabase history سابق، ويزيد أهمية إثبات حالة المشروع الحي.

## 5. التناقضات والوثائق القديمة

### تناقضات مؤكدة

- `AGENTS.md` يقول الحفاظ على local-first وعدم إدخال auth/roles أثناء v1، بينما runtime الحالي وADR 0001 وREADME يفرضان Supabase/Auth/admin/staff. **الكود وADR الأحدث هما السلوك الفعلي.**
- `docs/BUSINESS_MODEL.md` ما زال يقول إنه يطبق على Browser/PWA وTauri، ويعرض في القسم 6 أربع عشرة مشكلة "حالية"؛ معظمها أصلحته الاختبارات والكود الحالي. هذا القسم historical/stale.
- `docs/EXECUTION_CHECKLIST.md` يكرر البند `12.09` كـ deferred رغم أن البنود 11.07–11.09 نفسها تسجل إتمام backup reminder/PIN/storage indicator.
- نفس checklist يسجل `4.03` PWA build verified، ثم `5.03` ما زال pending لنفس النطاق تقريبًا.
- `docs/RUNTIME_QA.md` يذكر audit قديمًا فيه React Router advisory، بينما `npm audit` الحالي = 0 بعد dependency update.
- `README.md` يقول بوابة الإصدار تشمل "فحص Supabase الحي وVercel بعد النشر"؛ workflow `verify.yml` لا ينفذ live Supabase ولا deployed Vercel check، بل mocks browser network في E2E.
- `INSTALLATION_GUIDE.md` يسمح `npm أو pnpm`، لكن لا pnpm lock أو scripts مثبتة؛ المسار المؤكد npm فقط.
- `windows-release.yml` يبني Tauri على branch `feature/supabase-auth` بينما ADR يخرجه من الإصدار الرسمي و`main` لا يشغله.

### جودة التوثيق

- الوثائق غنية جدًا في business rules والتاريخ، لكنها طويلة ومكررة وتخلط desired target مع current implementation.
- README وADR 0001 حديثان ومتوافقان نسبيًا مع runtime.
- لا يوجد قبل هذه الجولة document واحد يجمع current route inventory + actual snapshot database + current verification gaps، لذا أضيفت الملفات الأربعة.

## 6. الأمن وحدود الثقة

### نقاط جيدة متحققة من الكود

- Auth حقيقي، active profile gate، RLS، server role checks، CSP/security headers.
- private snapshot غير متاح للـ anon حسب migrations؛ public catalogue ضيق.
- optimistic concurrency + idempotency + rollback.
- PIN verifier لا يخزن PIN نفسه.
- لا secrets خاصة مطبوعة في هذا المستند؛ المفاتيح المتتبعة هي browser publishable configuration وليست service-role key.

### مخاطر

- `.env.production` وWindows workflow يحتويان Supabase project URL وpublishable key في Git. هذا النوع مصمم للواجهة العامة، لكنه يجعل صحة RLS الحد الأمني الحاسم.
- admin قادر server-side على استبدال snapshot وحذف بيانات؛ compromise لحساب admin عالي الأثر.
- لا MFA policy أو password policy أو account provisioning evidence في repo.
- لا rate limit/lockout للـ device PIN.
- condition photos وبيانات العملاء داخل snapshot موحد؛ أي active user المسموح له بقراءة snapshot يرى كل بيانات المعرض. هذا مقصود لمعرض واحد لكنه ليس least-privilege على مستوى feature.
- لم يتم فحص إعدادات Supabase dashboard الحية، Auth URL policies، backups أو storage bucket state.

## 7. unknowns حرجة

- هل current `main` منشور فعلًا؟ وما production URL الرسمي؟
- هل Supabase migrations 0016–0018 مطبقة بلا drift؟
- كم حجم snapshot الحالي ومعدل نموه؟ وهل توجد صور condition كافية للاقتراب من 20 MiB؟
- من ينشئ/يعطل الحسابات، وهل MFA مفعل؟
- هل Supabase backups/PITR مفعلة، ومن اختبر restore؟
- هل `showroom_mutations` و`client_error_events` لهما retention؟
- هل قوالب الطباعة والكاميرا تعمل على الأجهزة والطابعات الفعلية؟
- هل مستخدمو Tauri التاريخيون موجودون ويحتاجون migration path؟

## 8. أعلى المخاطر مرتبة

1. **استمرارية البيانات المركزية:** لا server backup/restore evidence في repo، مع snapshot واحد لكل المعرض.
2. **فرق الحقيقة بين repo والإنتاج:** فشل التحقق الحي، وآخر deployment ظاهر أقدم من current main.
3. **حد snapshot والصور:** تصميم full-state commit بحد 20 MiB قد يتحول إلى stop-the-line failure.
4. **صلاحية admin والحسابات:** admin عالي الأثر بلا workflow provisioning/MFA موثق.
5. **غياب real-device release evidence:** الكاميرا والطباعة والتثبيت وoffline/update غير موقعة ميدانيًا.

## 9. الحالة النهائية لهذه الجولة

- لم تُجر أي repairs واسعة.
- لم تُعدّل migrations أو runtime أو config أو dependencies.
- baseline الآلي الأساسي أخضر.
- E2E المحلي والتحقق الحي/native موصوفان بصراحة كغير مكتملين.
