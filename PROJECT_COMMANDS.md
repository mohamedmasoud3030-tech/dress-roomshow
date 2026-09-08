# أوامر مشروع LENA المؤكدة

> تم التحقق أولًا على Node `v22.22.3`، ثم أعيدت بوابة `npm ci` والاختبارات والأنواع وESLint والبناء على default المعتمد Node `v22.23.2` مع npm `10.9.8`. لا تضع قيم البيئة أو credentials في سجلات عامة.

## 1. المتطلبات

- Node.js ضمن `^22.23.2 || ^24.0.0`؛ الإصدار المحلي الافتراضي في `.nvmrc` هو `22.23.2`، وCI يتبع أحدث patch من سلسلة Node 22 عبر `node-version: 22`.
- npm؛ lockfile الرسمي `package-lock.json`.
- اتصال Supabase للتشغيل الفعلي.
- Chromium عبر Playwright لاختبارات E2E.
- Rust/Cargo وplatform toolchain فقط إذا فُحصت جزيرة Tauri التاريخية.

لا يوجد دليل متحقق على pnpm/yarn/bun، ولا monorepo bootstrap.

## 2. إعداد البيئة

```bash
cp .env.example .env.local
```

ثم عيّن، دون نشر القيم:

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

`VITE_SUPABASE_ANON_KEY` fallback legacy فقط. لا يحتاج frontend إلى `service_role` ويجب عدم وضعه في `VITE_*`.

Production configuration tracked in `.env.production` يحتوي browser publishable configuration. لا تنسخه إلى report أو log.

## 3. التثبيت والتطوير

```bash
npm ci
npm run dev
```

Vite يستمع افتراضيًا على port 5173، وconfig يسمح host خارجيًا. التشغيل الفعلي بعد login يحتاج Supabase وحالة `showroom_state/main` صحيحة.

Preview لبناء الإنتاج:

```bash
npm run build
npm run preview
```

## 4. بوابة الجودة الأساسية

الترتيب الإلزامي في `AGENTS.md`:

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

النتائج الحالية:

| الأمر | النتيجة في 2026-08-17 |
| --- | --- |
| `npm ci` | PASS؛ 539 package؛ 0 vulnerabilities. تحذير engine لـ `@zxing/library` وتحذير deprecated transitive `glob`. |
| `npm test` | PASS؛ 676 pass، 0 fail، 0 skipped عبر 63 invocation. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |
| `npm run build` | PASS؛ Vite 2,216 modules؛ PWA 138 precache entry (~2.77 MiB). |

مراجعة dependencies:

```bash
npm audit --omit=dev
npm audit
```

كلاهما أعطى `found 0 vulnerabilities` في baseline الحالي.

## 5. الاختبارات

كل الاختبارات التشغيلية Node:

```bash
npm test
```

أمثلة لاختبار نطاق محدد، وكلها scripts موجودة فعلًا:

```bash
npm run test:architecture
npm run test:persistence-engine
npm run test:auth
npm run test:finance
npm run test:finance-reconciliation
npm run test:workflows
npm run test:reservation-conflicts
npm run test:backup-integrity
npm run test:pwa
npm run test:cloud-source-of-truth
```

قائمة scripts الكاملة هي `package.json`; default `npm test` يشمل 63 مجموعة فرعية.

### E2E

المسار المقصود محليًا:

```bash
npx playwright install chromium
npm run test:e2e
```

أو كما يفعل CI بعد build منفصل:

```bash
npx playwright install --with-deps chromium
npx playwright test
```

`playwright.config.ts` يشغل:

- `desktop-chromium`؛
- `mobile-360` عند 360×740؛
- `mobile-390` عند 390×844؛
- production preview على `127.0.0.1:4173`.

**نتيجة هذه الجولة:** تنزيل Chromium فشل بـ `ECONNRESET` من CDN، لذلك لم ينفذ E2E محليًا. latest GitHub `Verify` على نفس commit نجح، لكنه لا يلغي الحاجة لإعادة الفحص المحلي/الميداني عند توفر الشبكة.

## 6. فحص PWA

```bash
npm run test:pwa
```

هذا الأمر يبني أولًا ثم يفحص manifest/icons/fonts/cache/fallback/registration/prompt update. للفحص اليدوي الآمن:

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

ثم افحص install، reload offline، وتحديث build على جهاز فعلي. shell offline لا يعني أن العمليات تعمل offline؛ cloud hydration يتطلب الشبكة.

## 7. قاعدة البيانات وSupabase

المigrations في:

```text
supabase/migrations/0001_initial_schema.sql
...
supabase/migrations/0024_lock_legacy_authority_surfaces.sql
```

فحص clean PostgreSQL الإلزامي لسطح السلطة (ينشئ قاعدة مؤقتة، يثبت bypass التاريخي قبل الإصلاح، ثم يثبت المنع بعد الإصلاح):

```bash
# عند تشغيل PostgreSQL محلياً كخدمة نظام:
LENA_PG_TEST_USE_SUDO=1 npm run test:supabase-authority
```

الاختبار لا يتصل بمشروع Supabase المنشور ولا يحتاج credentials للمشروع. في CI يجب توفير PostgreSQL disposable؛ workflow `Supabase schema authority` يفعله تلقائياً.

لا يوجد `supabase/config.toml` ولا npm script لتطبيق migrations على production في هذا checkout. لذلك لا تطبق SQL يدويًا على production. استخدم سلسلة migration الطبيعية وrunbook [`docs/SUPABASE_AUTHORITY_REMEDIATION_DEPLOYMENT.md`](docs/SUPABASE_AUTHORITY_REMEDIATION_DEPLOYMENT.md) مع backup وrollback ومراجعة `supabase migration list --linked`.

فحص contract دون backend حي:

```bash
npm run test:auth
npm run test:cloud-source-of-truth
npm run test:authority-surface
```

هذا يتحقق من code/migration text؛ أما `test:supabase-authority` فيتحقق من schema وسلوك PostgreSQL النظيف.

## 8. البناء والنشر

Vercel config المؤكد:

```bash
npm run build
# output: dist/
```

`vercel.json` يحدد Vite وSPA rewrites وsecurity headers. لا يوجد deploy command أو Vercel workflow داخل `.github/workflows`; deployment يبدو integration خارجيًا، لذلك لا نخمن أمر النشر.

CI workflows:

```text
.github/workflows/build.yml
.github/workflows/verify.yml
.github/workflows/windows-release.yml
```

لرؤية الحالة من GitHub:

```bash
gh run list --limit 10
gh pr list --state open
```

## 9. Tauri التاريخي

أوامر package المعرفة:

```bash
npm run tauri -- info
npm run tauri -- build
```

ولـ Windows workflow:

```bash
npm run tauri -- build --bundles nsis
```

لكن Tauri خارج الإصدار الرسمي حسب ADR 0001. في baseline الحالي `rustc` و`cargo` غير مثبتين، لذلك لم يُنفذ build. `tauri -- info` ليس دليل native build.

## 10. أوامر discovery الآمنة التي نُفذت

```bash
git status --short --branch
git branch -vv
git worktree list --porcelain
git log --oneline --decorate -15
git remote -v
find src -type f | sort
find tests -type f
rg ... src tests supabase .github docs
node --version
npm --version
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
npm audit
gh pr list --state open
gh run list --limit 10
```

كما جرت محاولة read-only إلى public Supabase REST وprivate anonymous endpoint، لكن TLS أغلق قبل HTTP؛ لم تُعرض أي بيانات أو مفاتيح.

## 11. أوامر يجب تجنبها في discovery

لا تستخدم دون خطة backup/rollback وتفويض واضح:

```bash
supabase db reset
supabase db push
npm run tauri -- build   # إن كان الهدف فقط Web/PWA
```

ولا تستخدم `git reset`, `git clean`, حذف storage، أو تشغيل reset/import على بيانات production أثناء الفحص.
