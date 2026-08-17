# تدقيق الاعتماديات وأدوات البناء والدين التقني — LENA

> تاريخ التدقيق: 2026-08-17
>
> النطاق: المستودع الكامل، مع مراجعة read-only.
>
> لم تُحدّث أي حزمة، ولم يُحذف أو يُعاد هيكلة كود المنتج. بعد اختيار خطوة الصيانة، ثُبّت default Node `22.23.2` بشكل قابل للعكس في metadata وCI والوثائق، مع test يمنع drift.

## 1. الخلاصة التنفيذية

لا توجد حاليًا ثغرات npm معروفة في شجرة المشروع: `npm audit` و`npm audit --omit=dev` كلاهما أعطيا صفرًا. `package-lock.json` صالح من الإصدار 3، وكل direct package مثبت من registry يحمل integrity. البناء وTypeScript وESLint نجحت.

لكن توجد ديون صيانة حقيقية لا تظهر في `npm audit`:

1. بيئة الفحص الأساسية استخدمت Node `22.22.3`، وهي أقدم من security release الرسمي `22.23.0`. أحدث patch رسمي متحقق الآن هو `22.23.2` الصادر في يوليو 2026. خط Node 22 نفسه ما زال Maintenance LTS حتى أبريل 2027، لذلك الاختيار الآمن هو patch داخل نفس major وليس تغيير major.
2. `@zxing/library@0.22.0` يعلن Node `>=24` بينما المشروع وCI يعلنان Node 22؛ `npm ci` يعطي `EBADENGINE`. الكود يعمل في المتصفح والاختبارات الحالية تنجح، لكن support contract متعارض.
3. `vite.config.ts` يضع `server.allowedHosts: true`. وثائق Vite الرسمية تحذر أن هذا يفتح dev server لهجمات DNS rebinding وتسريب source/content.
4. `class-variance-authority` و`date-fns` direct dependencies بلا أي import حالي. `date-fns` وحده يشغل نحو 35 MiB داخل `node_modules`، لكنه لا يدخل client bundle لأنه غير مستخدم.
5. توجد ثلاث مجموعات circular dependencies فعلية، منها cycle بين `reservation.service` و`reservationAccessory.service`، وcycle داخل persistence/migrations.
6. الحسابات المالية الأساسية مكتوبة في `.js` مع ملفات `.d.ts` منفصلة؛ TypeScript يثق في التصريح لكنه لا يفحص implementation. كما يوجد `format.js` و`format.ts` متوازيان.
7. CI يعيد نفس build حتى ثلاث مرات في PR واحد، ويشغل 64 npm subprocess في `npm test`؛ هذا استهلاك وقت وحوسبة بلا قيمة اختبارية إضافية بنفس المقدار.
8. PWA precache يحمّل كل lazy assets، بما فيها ZXing chunk بحجم 444 KiB raw، ويخزن 138 ملفًا بحوالي 2.77 MiB. code splitting لا يوفر تكلفة التثبيت في الوضع الحالي.

### التوصية العامة

- **لا ترقية شاملة.**
- حدّث Node 22 إلى آخر patch أمني فقط.
- لا تنتقل الآن إلى React 19 أو Vite 8 أو Tailwind 4 أو Zod 4؛ هذه migrations مستقلة وتحتاج اختبارات مخصصة وليست علاجًا لثغرة حالية.
- ابدأ بأعمال قليلة الجهد وعالية العائد: ضبط dev host، إزالة direct dependencies غير المستخدمة بعد تحقق نظيف، توحيد PostCSS config، وضبط CI.
- افصل معالجة cycles وملفات المال JS/`.d.ts` إلى مراحل مستقلة بعد إغلاق عيوب الإنتاج الأعلى أولوية المسجلة في `PROJECT_DEFECTS.md`.

## 2. القرار الافتراضي المنفذ: Node 22.23.2

### الخيارات الواقعية

| الخيار | ملاءمة المنتج والمشروع | الأمان والدعم | عبء التشغيل والصيانة | مخاطر الهجرة | lock-in / الكلفة | النتيجة |
| --- | --- | --- | --- | --- | --- | --- |
| البقاء على `22.22.3` | أعلى توافق لحظي، لكنه لا يضيف قيمة | يسبق security release `22.23.0` | لا عمل الآن، لكن يبقي build machines على patch قديم | صفر | Node مفتوح المصدر ولا كلفة ترخيص | مرفوض |
| اعتماد `22.23.2` exact | نفس major ونفس npm، ونجحت عليه كل الفحوص | أحدث patch رسمي متحقق، وNode 22 ما زال LTS | `.nvmrc` وCI وengines تصبح متطابقة؛ يحتاج patch bump يدويًا لاحقًا | منخفضة جدًا | لا vendor lock-in جديد ولا كلفة مادية | **الخيار الافتراضي** |
| الانتقال إلى Node `24.19.0` LTS | يحل warning دعم ZXing ويعطي runway أطول | LTS حديث | يحتاج matrix أوسع وقرار toolchain جديد | متوسطة بسبب Tauri/camera/E2E غير المتحققين | لا كلفة ترخيص، لكن كلفة اختبار أعلى | مؤجل |
| Node 26 Current | لا حاجة منتجية | official guidance يفضل LTS للإنتاج | churn أعلى | عالية بلا فائدة حالية | لا كلفة ترخيص | غير مناسب |

### سبب الاختيار

أهم سبب هو خفض خطر build/supply-chain الأمني **دون تغيير product behavior أو major runtime**. الإصدار `22.23.2` موثق رسميًا بتاريخ 2026-07-28، يستخدم npm `10.9.8` نفسه، ويناسب Vite/React/Supabase الحاليين. pin واضح يساعد المطورين وAI agents على إعادة نفس البيئة بدل تفسير `node-version: 22` بشكل مختلف في كل وقت.

### المقايضة المهمة

يبقى warning `@zxing/library` لأنه يطلب Node >=24. الانتقال إلى Node 24 الآن سيزيل هذا التعارض، لكنه يرفع migration/test burden قبل توفر browser camera وWindows/Tauri evidence. لذلك لم نخلط security patch صغيرًا مع toolchain migration أوسع.

### متى نغيّر القرار؟

انتقل إلى Node 24 عندما يتحقق واحد من التالي:

1. اقتراب Node 22 من EOL في أبريل 2027؛
2. تحول ZXing engine warning إلى install failure؛
3. إكمال camera/E2E وWindows checks على Node 24 بنجاح؛
4. dependency رئيسية مدعومة فعليًا تتوقف عن دعم Node 22.

### ما تم تغييره بأمان

- `.nvmrc` = `22.23.2`.
- `package.json` و`package-lock.json`: `^22.23.2 || ^24.0.0`، لاستبعاد Node 23 غير LTS.
- workflows الثلاثة تستخدم `node-version: '22.23.2'`.
- دليل التركيب والأوامر يحدثان default بوضوح.
- لا package أو product behavior أو deployment تغير.

## 3. baseline المتحقق

### نسخ التشغيل والأدوات

| العنصر | الحالة الحالية | الملاحظة |
| --- | --- | --- |
| Node | baseline runtime كان `v22.22.3` | تم اعتماد default `22.23.2` في `.nvmrc` وCI، ورفع package engine إلى `^22.23.2 || ^24.0.0` لاستبعاد Node 23 غير LTS. Node 22 مدعوم حتى 2027-04-30. |
| npm | `10.9.8` | package manager الفعلي؛ lockfile واحد. |
| TypeScript | manifest `5.7.2` | strict + noUnused؛ `skipLibCheck=true`. |
| React | `18.3.1` | React 19 أحدث، لكن 18.3 أصدرته React تحديدًا كمرحلة تحضير للترقية؛ لا دليل أن 18.3 غير مدعوم أمنيًا أو أنه يجب تغييره فورًا. |
| Vite | `6.4.3` | صفحة Vite الرسمية ما زالت تذكر `vite@6.4` ضمن security-backport ranges؛ لا حاجة major عاجلة. |
| Tailwind | `3.4.17` | v4 migration تغير config وأسماء utilities؛ ليست patch عادية. |
| Supabase JS | manifest `^2.108.2`, lock `2.112.3` | الحزمة الفعلية أحدث داخل range. |
| Playwright | manifest/lock `^1.62.1` / `1.62.1` | E2E لم يعمل محليًا لغياب browser binary، وليس بسبب package compile. |
| Tauri | JS API `2.2.0`, CLI `2.2.2` | خارج release الرسمي، لكنه ما زال يضيف وزن install وصيانة. |

### أوامر المراجعة ونتائجها

```text
npm audit                     PASS — 0 vulnerabilities
npm audit --omit=dev          PASS — 0 vulnerabilities
npm outdated --json           PASS — أظهر updates فقط، لا advisory
npm ls / npm explain          PASS — شجرة قابلة للحل
npm run typecheck             PASS
npm run lint                  PASS
npm run build                 PASS — 2217 modules
custom import-cycle scan      3 strongly connected groups
source/package usage scan     2 direct runtime packages بلا references
lockfile metadata scan        1 deprecated transitive package، 5 install-script packages
```

نتيجة build المهمة:

```text
PWA precache       138 entries / 2774.78 KiB
main index         317.27 KiB / 88.55 KiB gzip
vendor-react       180.95 KiB / 59.60 KiB gzip
vendor-zxing       444.19 KiB / 112.87 KiB gzip
vendor-forms        82.84 KiB / 22.89 KiB gzip
CSS                 70.73 KiB / 11.09 KiB gzip
```

### ملاحظات شجرة الاعتماديات

- وجد lockfile **43 اسم حزمة بأكثر من version**. العدد يبدو كبيرًا لأن lockfile يسجل optional binaries لكل منصة، وليس لأن 43 نسخة تدخل browser bundle.
- أهم duplication فعلي: `esbuild@0.25.12` يأتي مع Vite و`esbuild@0.28.2` يأتي مع `tsx`. ranges مختلفة، لذلك override/dedupe إجباري غير مبرر.
- `@eslint/js` موجود direct عند 9.17 ومتداخل مع tooling أحدث؛ align داخل major 9 هو المعالجة الآمنة بدل override.
- `npm dedupe --dry-run` لم يقترح إزالة أو تغيير package؛ أظهر optional platform additions فقط. لا يوجد dedupe win واضح يستحق تعديل lockfile الآن.
- لا package manager أو lockfile ثانٍ. لا يوجد `Cargo.lock` لـ Tauri، وهي مشكلة منفصلة إذا عاد Desktop إلى الدعم.

### مصادر الدعم الرسمية

- Node release policy وEOL: `https://nodejs.org/en/about/releases/`
- Node security release يونيو 2026: `https://nodejs.org/en/blog/vulnerability/june-2026-security-releases`
- Node 22.23.2 archive: `https://nodejs.org/en/download/archive/v22.23.2`
- Vite supported versions: `https://vite.dev/releases`
- Vite `allowedHosts` security warning: `https://vite.dev/config/server-options`
- React 19 upgrade guide وسبب React 18.3: `https://react.dev/blog/2024/04/25/react-19-upgrade-guide`
- Tailwind v4 migration changes: `https://tailwindcss.com/docs/upgrade-guide`

## 4. تصنيف الدين

| النوع | النتائج الرئيسية |
| --- | --- |
| **Confirmed security/support risk** | عولج default Node patch إلى 22.23.2؛ المتبقي `allowedHosts: true`, ZXing engine conflict، وdeprecated `glob` بلا advisory حالي. |
| **Correctness/reliability debt** | circular imports، JS + `.d.ts` split للمال، PostCSS config مزدوج، duplicated business labels، missing `Cargo.lock`. |
| **Delivery-speed debt** | CI builds مكررة، 64 npm subprocess، direct deps غير مستخدمة، Tauri dependencies معزولة، غياب dependency automation. |
| **Performance/cost debt** | full PWA precache للـ ZXing/fonts، main bundle، three builds per PR، dependencies كبيرة في install. |
| **Cosmetic/low-value cleanup** | stale `components.json`, mock delegates، `ImageGallery`, historical docs، ترتيب/أسلوب الملفات. |

## 5. سجل الدين المرتب

التقييم من 1 إلى 5:

- **RR:** مقدار خفض المخاطر.
- **UV:** قيمة مباشرة للمستخدمة أو استمرارية العمل.
- **Effort:** جهد التنفيذ والتحقق؛ الأقل أفضل.
- الترتيب يعطي الأولوية لـ RR/UV المرتفعين مع effort منخفض، ولا يعني تنفيذ كل بند.

| ID | الفئة | RR | UV | Effort | الأولوية | هل التأجيل معقول؟ |
| --- | --- | ---: | ---: | ---: | --- | --- |
| TD-01 | Security/support | 5 | 3 | 1 | الآن | لا؛ patch أمني بسيط. |
| TD-02 | Security/dev tooling | 4 | 2 | 1 | الآن | قصيرًا فقط إذا dev server محصور محليًا. |
| TD-03 | Delivery/correctness | 3 | 2 | 1 | قريب | نعم لفترة قصيرة. |
| TD-04 | Delivery/cost | 3 | 2 | 1 | قريب | نعم، لا يؤثر runtime. |
| TD-05 | Support/reliability | 4 | 3 | 3 | خطة مستقلة | نعم حتى real-camera matrix وقرار Node 24. |
| TD-06 | Correctness | 4 | 4 | 3 | بعد عيوب الإنتاج | نعم قصيرًا؛ الاختبارات المالية قوية، لكن ليس طويلًا. |
| TD-07 | Correctness/architecture | 4 | 3 | 4 | بعد عيوب الإنتاج | نعم إذا لم تُمس هذه الوحدات. |
| TD-08 | Reliability | 3 | 2 | 1 | قريب | نعم، طالما الملفان متطابقان. |
| TD-09 | Delivery/cost | 3 | 2 | 2 | قريب | نعم حتى مراجعة branch checks. |
| TD-10 | Performance/PWA | 3 | 3 | 2 | بعد قياس جهاز | نعم؛ لا outage حالي مثبت. |
| TD-11 | Correctness/type safety | 3 | 3 | 3 | مخطط | نعم قصيرًا. |
| TD-12 | Delivery/security hygiene | 3 | 1 | 2 | قريب | نعم، لكن يزيد خطر تراكم majors. |
| TD-13 | Delivery/legacy | 2 | 1 | 3 | مؤجل | نعم بوضوح حتى قرار Tauri. |
| TD-14 | Correctness | 2 | 2 | 1 | opportunistic | نعم؛ الأثر الحالي wording drift. |
| TD-15 | Maintainability | 3 | 2 | 4 | عند تعديل hotspot | نعم؛ refactor بلا هدف الآن قليل القيمة. |
| TD-16 | Type/lint debt | 2 | 2 | 1 | opportunistic | نعم قصيرًا. |
| TD-17 | Support/deprecation | 2 | 1 | 3 | monitor upstream | نعم؛ audit صفر ولا direct fix نظيف. |
| TD-18 | Documentation drift | 2 | 2 | 2 | قريب | نعم، لكن يبطئ التسليم ويضلل الوكلاء. |
| TD-19 | Cosmetic/dead candidates | 1 | 1 | 2 | أخيرًا | نعم؛ لا قيمة لحذفها الآن دون إثبات. |

## 6. تفاصيل النتائج

### TD-01 — Node patch المحلي أقدم من security release

- **التصنيف:** Confirmed security/support risk.
- **الدليل:** baseline `node --version` = `22.22.3`. Node نشر `22.23.0` لإصلاح قضايا أعلى شدتها High، وأحدث patch رسمي متحقق هو `22.23.2`. Node 22 نفسه Maintenance LTS حتى 2027-04-30.
- **الأثر الفعلي:** أدوات build/test على runtime قديم كانت قبل security patch. Browser production static bundle لا يشغل Node، لكن CI/build machine وسلسلة التوريد تتأثران.
- **الاحتمال:** متوسط في local/dev؛ workflow العام `node-version: 22` لم يكن يضمن تطابق المطور وCI.
- **المعالجة المعتمدة:** local default `22.23.2` في `.nvmrc` مع package engine `^22.23.2 || ^24.0.0`; workflows تتبع سلسلة 22. بقيت نفس LTS ونفس npm 10.9.8.
- **مخاطر migration:** منخفضة؛ لا major change.
- **الاختبارات المطلوبة:** `npm ci`, full test, typecheck, lint, build, Playwright.
- **rollback:** الرجوع إلى آخر patch 22 موثق إذا ظهر tooling regression.
- **التأجيل:** غير مفضل.

### TD-02 — `allowedHosts: true` يعطل حماية Vite dev host

- **التصنيف:** Confirmed security risk في بيئة التطوير.
- **الدليل:** `vite.config.ts` يحتوي `server: { host: true, allowedHosts: true }`. Vite يحذر رسميًا من DNS rebinding وتسريب source/content عند القيمة `true`.
- **الأثر:** عند تشغيل `npm run dev` على شبكة غير موثوقة يمكن لموقع خارجي الوصول إلى dev server عبر DNS rebinding. لا يطبق على static Vercel production.
- **الاحتمال:** منخفض إذا التطوير محلي فقط، ومتوسط إذا server يُفتح على LAN/preview.
- **أصغر معالجة:** قائمة hosts صريحة، مع preview host يحقن من environment غير production بدل السماح للجميع.
- **مخاطر dependency/migration:** منخفضة؛ config فقط، لكن يجب ألا يكسر Arena preview أو dev LAN المقصود.
- **الاختبارات:** dev preview host، localhost، rejected unknown Host، production build.
- **rollback:** إعادة host المسموح المطلوب فقط، لا `true` دائم.
- **التأجيل:** معقول مؤقتًا إذا لا يُشغل dev server خارج sandbox/local.

### TD-03 — direct dependencies غير مستخدمة

- **التصنيف:** Delivery-speed/cost debt، وليس client performance defect حاليًا.
- **الدليل:** لا import لـ `class-variance-authority` أو `date-fns` في `src` أو tests. `npm explain` يبين أن كلاهما direct root فقط. `date-fns` يشغل نحو 35 MiB في `node_modules`.
- **الأثر:** download/install/cache أكبر وsurface صيانة أوسع. Tree shaking يمنعهما من client bundle الحالي.
- **الاحتمال:** مؤكد كتكلفة install؛ أثر الوقت يعتمد cache/network.
- **أصغر معالجة:** إزالة كل حزمة في commit مستقل، وليس تحديثها.
- **مخاطر:** منخفضة، لكن dynamic import غير ظاهر في `rg` احتمال ضئيل.
- **الاختبارات:** clean `npm ci`, full tests, build، وفحص lock diff.
- **rollback:** إعادة dependency والlock entry.
- **التأجيل:** معقول، لكنه quick win جيد.

### TD-04 — إصدارات ESLint الأساسية غير متناسقة داخل major نفسه

- **التصنيف:** Delivery/tooling debt.
- **الدليل:** installed `eslint@9.39.5` بسبب `^9.39.4`، بينما direct `@eslint/js` مثبت exact `9.17.0`; `typescript-eslint` exact `8.18.2` بينما أحدث 8.x هو `8.67.0`.
- **الأثر:** recommended rule set أقدم من engine، وتحديثات bug fixes/rules لا تصل. لا failure حالي؛ lint ينجح.
- **الاحتمال:** منخفض حاليًا، يزداد عند تحديث ESLint أو TS.
- **أصغر معالجة:** أولًا align `@eslint/js` إلى `9.39.5` في PR tooling فقط. تعامل مع `typescript-eslint` 8.x منفصلًا لأن rules الجديدة قد تكشف ديونًا.
- **مخاطر:** منخفضة للأول، متوسطة للثاني بسبب lint delta.
- **الاختبارات:** `npm ci`, lint، typecheck، full test؛ راجع كل lint change بدل disable.
- **rollback:** lock/package revert فقط.
- **التأجيل:** معقول؛ لا security advisory.

### TD-05 — ZXing لا يدعم Node range المعلن للمشروع

- **التصنيف:** Confirmed support/reliability debt.
- **الدليل:** `npm ci` و`npm dedupe --dry-run` يطبعان `EBADENGINE`: `@zxing/library@0.22.0` يتطلب Node `>=24`, بينما package engine وCI يستخدمان 22. `@zxing/browser@0.2.1` ينتقل إلى library `0.23.0` التي ما زالت تتطلب Node >=24؛ patch update وحده لا يحل المشكلة.
- **الأثر:** unsupported install contract؛ package manager أكثر صرامة قد يفشل مستقبلًا. browser scanner نفسه lazy وقد يعمل لأن الكود النهائي Browser JS.
- **الاحتمال:** متوسط في tooling، غير متحقق على real camera.
- **أصغر معالجة:** لا تُجبر override. اختبر خيارين في branch: Node 24 LTS مع `@zxing/browser@0.2.1`، أو scanner package/version تدعم Node 22 فعليًا.
- **مخاطر:** متوسطة؛ barcode/camera core capability، وNode change يؤثر toolchain.
- **الاختبارات:** clean install على Windows/Linux، build، barcode unit، Playwright، grant/deny camera وجهاز فعلي/manual fallback.
- **rollback:** العودة كزوج Node/package متوافق سابق، لا package منفرد.
- **التأجيل:** معقول حتى matrix مخصص، طالما warning معروف ولا install gate صارم.

### TD-06 — منطق المال JS مع declarations منفصلة

- **التصنيف:** Correctness/reliability debt.
- **الدليل:** `financialCalculations.js` (121 lines) + `financialCalculations.d.ts` (75 lines)، و`dailyClosingCalculations.js` + `.d.ts`. `tsconfig` لديه `allowJs=false`; TypeScript يفحص callers ضد `.d.ts` ولا يفحص body الفعلي.
- **الأثر:** implementation وtypes يمكن أن ينفصلا بصمت، خصوصًا في أهم منطق مالي. الاختبارات الحالية تقلل الاحتمال لكنها لا تمنع كل mismatch.
- **الاحتمال:** متوسط عند التعديل القادم.
- **أصغر معالجة:** تحويل ملف واحد في المرة إلى `.ts` بنفس API، بدءًا بـ daily closing الأصغر، ثم finance؛ لا تغيير formulas.
- **مخاطر:** متوسطة/عالية لأن finance.
- **الاختبارات:** كل finance/deposit/reconciliation/daily-close/return tests، typecheck، build، golden scenarios.
- **rollback:** إبقاء commit migration bounded وقابلًا للرجوع؛ لا تعديل behavior معه.
- **التأجيل:** معقول قصيرًا فقط.

### TD-07 — ثلاث مجموعات circular imports

- **التصنيف:** Correctness/architecture debt.
- **الدليل:** scan لـ 271 source file و1141 resolved edge وجد:
  1. `persistenceEngine -> migrations -> migrationRunner -> transactions -> persistenceEngine`.
  2. `integrity.service -> contractLineHelpers -> dress.service -> integrity.service` مع reservation types/conflicts.
  3. `reservation.service <-> reservationAccessory.service`.
- **الأثر:** fragility في module initialization، صعوبة unit isolation، واتساع regression scope. لا crash حالي مثبت لأن معظم الاستدعاءات داخل functions بعد initialization.
- **الاحتمال:** متوسط عند نقل exports أو إضافة top-level initialization.
- **أصغر معالجة:**
  - persistence: انقل snapshot port/types إلى module منخفض مستقل، ولا تجعل transactions تستورد engine الذي يستورد migrations.
  - reservation/accessory: مرّر callbacks/ports أو انقل orchestration إلى workflow layer.
  - integrity: استخرج pure reference readers/rules بدل service-to-service cycle.
- **مخاطر:** عالية نسبيًا؛ architecture work وليس cleanup سريع.
- **الاختبارات:** architecture cycle gate جديد أولًا، persistence/workflow/accessory/reservation/full tests.
- **rollback:** كل cycle في commit مستقل مع API compatibility export.
- **التأجيل:** معقول إذا لا توجد تغييرات في هذه المناطق؛ غير معقول أثناء feature work عليها.

### TD-08 — PostCSS config مزدوج

- **التصنيف:** Correctness/reliability debt منخفض الجهد.
- **الدليل:** `postcss.config.cjs` و`postcss.config.mjs` كلاهما موجود ومتماثل حاليًا.
- **الأثر:** config loader precedence غير واضح للقارئ؛ تعديل واحد فقط مستقبلًا يسبب اختلاف dev/build أو confusion.
- **الاحتمال:** متوسط عند أول تعديل CSS tooling.
- **أصغر معالجة:** حدد الملف الذي Vite/PostCSS يحمّله، احتفظ بواحد، وأضف build assertion للـ Tailwind/font output.
- **مخاطر:** منخفضة، لكن PWA Arabic font سبق أن تأثر بترتيب CSS.
- **الاختبارات:** build، PWA build contract، visual smoke.
- **rollback:** استعادة الملف الثاني.
- **التأجيل:** معقول ما داما متطابقين.

### TD-09 — CI يكرر البناء ويستهلك subprocesses كثيرة

- **التصنيف:** Delivery-speed/performance-cost debt.
- **الدليل:**
  - `Build` workflow يبني مرة.
  - `Verify`: `npm test` يشغل `test:pwa` الذي يبني، ثم step `npm run build` يبني ثانية.
  - PR يشغل Build وVerify، فيصبح build ثلاث مرات.
  - `npm test` يسلسل 64 npm scripts، وكل واحد يبدأ Node/npm process جديدًا.
- **الأثر:** feedback أبطأ، GitHub minutes أعلى، وضوضاء logs ضخمة.
- **الاحتمال:** مؤكد لكل PR.
- **أصغر معالجة:** احتفظ بrequired check names، لكن اجعل build artifact مرة واحدة في Verify أو افصل PWA assertion عن build عند وجود dist. لا تدمج tests parallel قبل فحص shared localStorage/global hooks.
- **مخاطر:** متوسطة؛ تغيير branch checks أو parallelism قد يخفي ordering bugs.
- **الاختبارات:** قارن عدد tests 694، artifact hash/manifest، Verify PR تجريبي.
- **rollback:** workflow revert.
- **التأجيل:** معقول، لكنه quick delivery win.

### TD-10 — code splitting لا يقلل PWA install cost للماسح

- **التصنيف:** Performance/cost debt.
- **الدليل:** `BarcodeScanner` lazy، لكن Workbox `globPatterns` precache كل JS؛ build يضيف `vendor-zxing` 444.19 KiB raw/112.87 gzip إلى 138-entry precache.
- **الأثر:** أول install/update يحمل scanner حتى لمن لا تستخدمه، مع font assets كثيرة. يؤثر الشبكات والأجهزة الضعيفة.
- **الاحتمال:** مؤكد في generated manifest؛ أثر UX يحتاج قياس جهاز.
- **أصغر معالجة:** ضع budget أولًا. بعد القياس، استبعد scanner chunk من precache واجعله runtime-cache، أو احتفظ به إذا offline camera requirement أهم.
- **مخاطر:** متوسطة؛ قد يفقد scanner offline بعد install.
- **الاختبارات:** PWA install online/offline، scanner offline decision، update size، Lighthouse/network throttling.
- **rollback:** إعادة glob pattern.
- **التأجيل:** معقول حتى قرار product وقياس فعلي.

### TD-11 — `format.js` و`format.ts` مساران لنفس الوظيفة

- **التصنيف:** Correctness debt.
- **الدليل:** الملفان ينفذان `formatMoneyOMR`; معظم callers يستوردون extensionless فيحصلون على TS، بينما print paths تستورد `.js` صراحة. هما متطابقان الآن.
- **الأثر:** تغير تنسيق المال في UI دون print أو العكس إذا عُدل ملف واحد.
- **الاحتمال:** متوسط عند تعديل currency formatting.
- **أصغر معالجة:** canonical TS module واحد مع compatibility re-export مؤقت، ثم تحويل explicit `.js` imports.
- **مخاطر:** متوسطة لأن العقود والفواتير.
- **الاختبارات:** print invoice/contract، format tests، Arabic OMR snapshots، build.
- **rollback:** compatibility file يعيد المسار السابق.
- **التأجيل:** معقول قصيرًا.

### TD-12 — لا توجد dependency automation أو ownership policy

- **التصنيف:** Delivery/security hygiene.
- **الدليل:** `.github` يحوي workflows فقط؛ لا Dependabot/Renovate، لا CODEOWNERS، ولا schedule audit.
- **الأثر:** patches لا تظهر دوريًا؛ majors تتراكم حتى تصبح migration كبيرة. `npm audit` اليدوي أخضر اليوم فقط.
- **الاحتمال:** مرتفع على المدى الزمني.
- **أصغر معالجة:** Dependabot أسبوعي محدود، groups حسب stack، PR limits، no auto-merge، وowner review.
- **مخاطر:** منخفضة تقنيًا، متوسطة من ضوضاء PRs.
- **الاختبارات:** كل update PR يمر full gate؛ majors disabled/explicit.
- **rollback:** حذف config.
- **التأجيل:** معقول قليلًا، ليس طويلًا.

### TD-13 — Tauri dependency island غير قابل لإعادة البناء بالكامل

- **التصنيف:** Delivery/legacy debt.
- **الدليل:** official ADR يخرج Tauri من release. مع ذلك root يثبت `@tauri-apps/api` وCLI (~36 MiB node_modules)، `src-tauri` موجود، Windows workflow على branch قديم، ولا يوجد `src-tauri/Cargo.lock`.
- **الأثر:** install وصيانة أوسع، وnative build غير reproducible بدقة. لا يؤثر official Web runtime بسبب architecture gate.
- **الاحتمال:** مؤكد كتكلفة؛ user impact فقط إذا يوجد مستخدم Desktop تاريخي.
- **أصغر معالجة:** قرار ملكية أولًا: archive خارجي/Workspace اختياري/استمرار مدعوم. لا تحذف قبل inventory للمستخدمين والبيانات.
- **مخاطر:** عالية إذا هناك مستخدمون Desktop.
- **الاختبارات:** Windows build/install/relaunch/backup/print قبل أي تغيير.
- **rollback:** صعب بعد حذف مسار migration؛ لذلك التأجيل صحيح.
- **التأجيل:** معقول ومفضل حتى قرار المالك.

### TD-14 — business labels مكررة وتختلف بالفعل

- **التصنيف:** Correctness/consistency debt محدود.
- **الدليل:** `shared/domain/reservationConstants.ts` يقول pending = `بانتظار التأكيد`, delivered = `تم التسليم`; `ledgerExports.ts` يعيد تعريف نفس map كـ `قيد التأكيد`, `مسلّم` وغيرها.
- **الأثر:** CSV لا يستخدم نفس مصطلحات الشاشة، ما يربك المحاسبة والدعم. لا يغير الأرقام.
- **الاحتمال:** مؤكد.
- **أصغر معالجة:** import canonical labels في export، مع snapshot test للعربية.
- **مخاطر:** منخفضة؛ output text change قد يؤثر ملفات مقارنة خارجية.
- **الاختبارات:** ledger export tests، owner approval على wording إذا CSV contract ثابت.
- **rollback:** إعادة map السابق.
- **التأجيل:** معقول لكنه quick win عند عمل exports.

### TD-15 — hotspots كبيرة جدًا

- **التصنيف:** Delivery-speed/maintainability debt.
- **الدليل:** 21 ملفًا >=300 lines؛ الأكبر:
  - `reservation.service.ts` 1083
  - `inventoryPerformance.service.ts` 693
  - `CreateReservationModal.tsx` 603
  - `DeliveryReturnModal.tsx` 561
  - `DressesPage.tsx` 536
- **الأثر:** reviews أصعب، cycles أسهل، وأي تعديل يوسع regression area.
- **الاحتمال:** مؤكد كتكلفة، وليس bug بذاته.
- **أصغر معالجة:** لا refactor عام. عند feature/bug في hotspot، استخرج pure calculation أو subcomponent واحد مع characterization test.
- **مخاطر:** متوسطة/عالية إذا movement واسع.
- **الاختبارات:** focused characterization قبل النقل + full relevant suites.
- **rollback:** bounded extraction commit.
- **التأجيل:** معقول؛ style-only split الآن قليل القيمة.

### TD-16 — suppression واحد يخفي type debt في reservation commands

- **التصنيف:** Type/lint debt.
- **الدليل:** أول سطر في `reservationCommands.ts` يعطل `no-explicit-any` و`no-unused-vars` للملف كله؛ `cancelReservationCommand` يستخدم `as any` مرتين.
- **الأثر:** أي `any` أو unused import جديد في 176 lines لن يكتشفه lint.
- **الاحتمال:** متوسط عند التعديل.
- **أصغر معالجة:** type guard/overload محلي للـ string-or-object input، ثم إزالة file-wide suppression.
- **مخاطر:** منخفضة إذا behavior محفوظ.
- **الاختبارات:** reservation cancel/financial/workflow tests + typecheck/lint.
- **rollback:** revert صغير.
- **التأجيل:** معقول قصيرًا، quick win جيد.

### TD-17 — deprecated transitive `glob@11.1.0`

- **التصنيف:** Support/deprecation risk، وليس advisory مثبتًا حاليًا.
- **الدليل:** lock يحمل deprecation message. المسار: `vite-plugin-pwa@0.21.1 -> workbox-build@7.4.1 -> glob^11.0.1`. `npm audit` = 0. حتى `vite-plugin-pwa@1.3.0` يعتمد Workbox 7.4.1 نفسه، فلا يحل السبب حتمًا.
- **الأثر:** warning وupstream support uncertainty؛ لا runtime browser code لأن build dependency.
- **الاحتمال:** منخفض حاليًا.
- **أصغر معالجة:** راقب Workbox/plugin release؛ لا تستخدم override لـ glob 13 دون compatibility proof.
- **مخاطر:** override عالي نسبيًا، plugin major متوسط.
- **الاختبارات:** clean install، build، PWA manifest/service worker/offline/update.
- **rollback:** package/lock revert.
- **التأجيل:** معقول.

### TD-18 — الوثائق النشطة والتاريخية تختلط

- **التصنيف:** Delivery-speed debt.
- **الدليل:** `TARGET_CODE_ARCHITECTURE.md` و`FINAL_DELIVERY_PLAN.md` ما زالا يصفان `App.tsx` كمالك لكل الصفحات و`AppLayout` كمختلط، بينما الكود نقل ذلك. `AGENTS.md` يحتوي قواعد local-first/no-auth قديمة تتعارض مع ADR Web/PWA + Supabase.
- **الأثر:** مطور أو agent قد ينفذ قرارًا قديمًا أو يعيد نظامًا منتهيًا.
- **الاحتمال:** مرتفع؛ instructions تُقرأ قبل العمل.
- **أصغر معالجة:** لا تعيد كتابة التاريخ؛ ضع status banner واضحًا وarchive links، وحدد current source order.
- **مخاطر:** منخفضة تقنيًا، لكن تحتاج owner agreement على policy.
- **الاختبارات:** docs/release-gate assertions فقط.
- **rollback:** docs revert.
- **التأجيل:** معقول قليلًا، لكنه يبطئ كل milestone.

### TD-19 — cleanup candidates ذات قيمة حالية ضعيفة

- **التصنيف:** Cosmetic/low-value cleanup.
- **الدليل:** لا callers حاليين لـ `ImageGallery.tsx`, `supabaseSync.ts` runtime helper إلا test، وملفات `*.mock.ts` الظاهرة لا imports لها. `components.json` يشير aliases `@/components/ui` غير موجودة وCVA غير مستخدمة.
- **الأثر:** ضوضاء search وفهم، لا bundle impact غالبًا لأن غير imported.
- **الاحتمال:** مؤكد كضوضاء، لكن قد تكون compatibility surface خارجية أو recovery reference.
- **أصغر معالجة:** verify imports عبر Git history/tests/docs ثم remove one category per PR.
- **مخاطر:** منخفضة إلى متوسطة حسب external imports غير مرئية.
- **الاختبارات:** build/full test، grep references، migration/recovery review.
- **rollback:** git restore/re-add.
- **التأجيل:** معقول جدًا؛ لا تبدأ به قبل security/correctness.

## 7. الحزم المقترحة للتحديث الآن

### تحديث مطلوب الآن

| العنصر | من | إلى | السبب | المخاطر |
| --- | --- | --- | --- | --- |
| Node runtime/toolchain | `22.22.3` في baseline | `22.23.2` | **تم اعتماده**: security patch رسمي مع بقاء نفس LTS major | منخفضة |

### تحديث npm صغير يصلح كأول PR صيانة، لكنه ليس emergency

| الحزمة | الحالي | الهدف المقترح | لماذا فقط هذا؟ |
| --- | --- | --- | --- |
| `@eslint/js` | `9.17.0` | `9.39.5` | align مع `eslint@9.39.5` المثبت؛ نفس major، tooling-only. راجع lint delta. |

**لا توجد حزمة runtime يجب تحديثها فورًا بسبب advisory حالي؛ audit صفر.** لا أوصي بتغيير أرقام لمجرد أن `npm outdated` عرضها.

## 8. الحزم التي يجب تأجيلها

| المجموعة | الحالي → الأحدث | سبب التأجيل | شرط البدء |
| --- | --- | --- | --- |
| React + types | 18.3 → 19.2 | breaking changes وtypes major؛ لا عيب حالي يحلّه | component/browser matrix وPR مستقل |
| Vite + React plugin | 6.4/4.3 → 8.2/6.0 | Vite 6.4 ما زال security-supported؛ plugin latest يتطلب Vite 8 | tooling migration مستقل + PWA/E2E |
| Tailwind | 3.4 → 4.3 | config/CSS model وأسماء utilities تتغير | visual regression على كل routes |
| Zod + resolvers | 3.24/3.9 → 4.4/5.9 | API/types behavior migration؛ forms حساسة | form tests حقيقية لا source regex فقط |
| `@zxing/browser` | 0.2.0 → 0.2.1 | patch ما زال يتطلب Node 24 عبر peer | قرار Node 24 + camera hardware test |
| Tauri API/CLI | 2.2 → 2.11 | خارج release الرسمي وبدون Windows baseline/Cargo lock | قرار استمرار Desktop أولًا |
| TypeScript | 5.7 → 7.0 | major toolchain + ecosystem compatibility غير مثبتة | بعد Vite/eslint matrix، لا معها |
| ESLint 10 stack | 9 → 10 | major rules/config، لا advisory حالي | بعد align داخل ESLint 9 |
| `vite-plugin-pwa` | 0.21 → 1.3 | major PWA lifecycle، ولا يزيل Workbox/glob تلقائيًا | install/offline/update regression suite |
| `lucide-react` | 0.469 → 1.31 | icons واسعة الاستخدام؛ visual/API drift محتمل، لا security need | screenshot/visual pass |
| `tailwind-merge` | 2.6 → 3.6 | major parser behavior؛ الحالي يخدم `cn` | Tailwind migration أو focused class tests |

## 9. عناصر غير مستخدمة يجب التحقق قبل حذفها

### مرشحة قوية للإزالة

| العنصر | الدليل | تحقق ما قبل الحذف |
| --- | --- | --- |
| `date-fns` | لا imports، direct root فقط، 35 MiB install | clean install + tests/build |
| `class-variance-authority` | لا `cva()` أو import؛ يبدو بقايا shadcn | افحص أي codegen planned، ثم tests/build |
| `ImageGallery.tsx` | لا caller في source/tests | history/docs ثم build |
| `report.mock.ts` وmock delegates | لا imports ظاهرة | تأكد demo loader لا يعتمد عليها باسم ديناميكي |
| `supabaseSync.ts` | helper compatibility مستخدم في test فقط | قرر هل public compatibility API مطلوب |
| `components.json` | aliases لا تطابق tsconfig ولا توجد `components/ui` | تأكد عدم استخدام shadcn CLI مستقبلًا |

### لا تُحذف الآن

- `src/services/*`: تبدو legacy لكنها ما زالت imported بكثافة كcompatibility facade.
- `src-tauri/*`, `@tauri-apps/*`: معزولة رسميًا لكن قد تكون طريق recovery لمستخدمين تاريخيين.
- `demoDataRecords.ts`: كبير لكنه مستخدم في demo-data tests/workflow.
- SVG/PNG/ICO داخل `src-tauri/icons`: generated-looking لكنها bundle source مطلوبة لبناء native.
- Arabic font weights الخمسة: كل 400/500/600/700/800 تقابل classes مستخدمة؛ التحسين يكون في format/precache لا حذف أعمى.

## 10. نقاط جيدة يجب الحفاظ عليها

- package واحد وlockfile واحد؛ لا lockfiles متنافسة.
- root package `private: true`؛ لا خطر نشر npm العرضي.
- لا root `preinstall`, `postinstall`, `prepare` أو install lifecycle scripts.
- install scripts الموجودة transitive فقط: `esbuild` و`fsevents`؛ متوقعة لأدوات binaries/platform، ولم يظهر script غريب.
- لا `dist`, `node_modules`, sourcemaps أو minified vendor code متتبع في Git.
- lock entries direct كلها تحتوي integrity وregistry resolved URLs.
- `npm audit` صفر، ولا private credential pattern ظهر في الفحص السابق؛ Supabase publishable config ليس secret.
- Vite 6.4 security-supported، فلا حاجة لمطاردة Vite 8 فورًا.
- ZXing route lazy، وReact/Tailwind chunks tree-shaken؛ المشكلة PWA precache لا bundling فقط.
- architecture tests تمنع official Web من استيراد Tauri.

## 11. خارطة صيانة مرحلية

### المرحلة A — Patch وأمان tooling منخفض المخاطر

1. Node 22 إلى آخر security patch.
2. استبدال `allowedHosts: true` بقائمة صريحة تعمل في local وArena preview.
3. align `@eslint/js` داخل major 9 فقط.
4. إضافة dependency automation أسبوعية بلا auto-merge.

**بوابة الاختبار:** clean install، 681 tests، typecheck، lint، build، Playwright عندما يتوفر browser.

### المرحلة B — تقليل تكلفة بلا تغيير runtime

1. إزالة `date-fns` ثم CVA كل منهما commit مستقل.
2. توحيد PostCSS config.
3. إزالة build المكرر مع الحفاظ على required checks.
4. إضافة bundle/precache budget report، لا fail gate قبل baseline متفق.

**Rollback:** package/lock أو workflow commit منفصل لكل تغيير.

### المرحلة C — Reliability boundaries

1. تحويل daily closing JS/`.d.ts` إلى TS.
2. تحويل financial calculations في milestone مالي منفصل.
3. توحيد `formatMoneyOMR` ومسارات print.
4. إزالة file-wide eslint suppression.
5. توحيد reservation status labels للواجهة وCSV.

**بوابة:** finance/reconciliation/printing/export suites + full tests، ولا تغييرات formulas أو wording بلا review.

### المرحلة D — فك cycles عند الحاجة

1. persistence cycle أولًا لأنه أدنى طبقة.
2. reservation/accessory orchestration إلى workflow boundary.
3. integrity/dress/contract helper cycle.
4. إضافة cycle check للـ CI بعد الوصول إلى صفر، لا قبله.

لا تخلط هذه المرحلة مع feature redesign أو database migration.

### المرحلة E — Major upgrades، كل stack منفصل

الترتيب المقترح فقط بعد استقرار production defects:

1. Node 24 + ZXing matrix، إذا تقرر.
2. Vite/plugin/PWA stack.
3. React 19 + types.
4. Tailwind 4.
5. Zod/resolvers.
6. TypeScript/ESLint majors.

لا تجمع أكثر من stack major في PR واحد؛ rollback والسبب يصبحان غير واضحين.

### المرحلة F — Cleanup منخفض القيمة

- dead mocks/helpers/components بعد إثبات.
- stale `components.json`.
- historical docs banners/archive.
- قرار Tauri النهائي.

هذه المرحلة آخرًا لأنها لا تخفض الخطر الحالي كثيرًا.

## 12. ما يحتاج موافقة قبل التنفيذ

- أي تغيير Node major إلى 24.
- حذف Tauri أو direct dependencies المرتبطة به.
- تغيير PWA precache/offline behavior.
- React/Vite/Tailwind/Zod/TypeScript major migrations.
- توحيد wording في CSV إذا يستخدمه نظام خارجي.
- حذف compatibility exports أو mock/recovery code.
- أي تغيير production build/deploy environment.

## 13. القرار المختصر

### نفذ أولًا بعد الموافقة

1. Node 22 security patch.
2. تقييد Vite `allowedHosts` دون كسر preview.
3. إزالة direct packages غير المستخدمة في commits منفصلة.
4. align `@eslint/js` 9.x.
5. تخفيف builds المكررة في CI.

### أجّل بشكل واعٍ

- كل major framework upgrade.
- ZXing حتى Node/camera matrix.
- Tauri حتى قرار المنتج.
- cycles/large-module refactors حتى تنتهي عيوب الإنتاج الأعلى أو يُفتح عمل في تلك المنطقة.
- cleanup الشكلي/dead candidates حتى إثبات عدم الحاجة.

النتيجة: المشروع لا يحتاج “upgrade everything”. يحتاج patch أمني واحد، config أمان واضح، تقليل حمل tooling المؤكد، ثم معالجة reliability debt بحدود واختبارات، مع تأجيل migrations الكبرى التي لا تعالج خطرًا قائمًا الآن.
�طرًا قائمًا الآن.
