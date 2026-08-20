# Technical Health Report — LENA

> Date: 2026-08-20 · Branch: `arena/01a01f12-lenadress` (from `main @ d7dd78f`, PR #144)
> Method: evidence-first — every claim below was verified in this sandbox against code,
> migrations, configuration, build output, test runs, or live HTTP responses. Prior audit
> documents were treated as leads, not proof.
> Author: Arena agent acting as principal engineer / security / DBA / integration / QA /
> performance / reliability lead (single-agent team per owner-approved session mode).

## ملخص تنفيذي للمالكة (بالعربية)

الحالة الفنية العامة **جيدة ومنضبطة**: 737 اختبارًا أخضر (بعد التحديث الثاني)، بناء إنتاجي
سليم، أذونات قاعدة البيانات محكمة (تحقّقنا منها سطرًا سطرًا)، ولا ثغرات تبعية معروفة.
أُغلقت هذه الجولة أخطر النقاط الصامتة: غياب نسخ احتياطية زمنية على الخادم، خطر «توقف الحفظ»
عند امتلاء قاعدة البيانات المركزية دون إنذار، تعليق محتمل للصفحة العامة على الشبكات الضعيفة،
ثم — في الجولة الثانية — ردع تخمين رمز قفل الجهاز (5 محاولات ثم قفل مؤقت متصاعد) وبطاقة
عداد «أخطاء النظام» المرئية للإدمن دون الحاجة لفتح لوحة Supabase. ما تبقى يحتاج إما جهازك
الحقيقي (إثبات الكاميرا/الطباعة/التثبيت) أو قرارات مالك على حساب Supabase (جدولة النسخ،
MFA، سياسات الاحتفاظ) — كلها مسعّدة في خطة المعالجة بترتيب صارم.

## Verified baseline (this sandbox, 2026-08-20)

| Check | Result |
| --- | --- |
| `npm ci` | 539 packages, **0 vulnerabilities** |
| `npm test` | **719/719 pass**, 0 fail, 0 skipped (65 suites in the chain) |
| `npm run typecheck` / `lint` / `build` | all pass; PWA precache 140 entries (~2.8 MB) |
| Live preview (vite preview, built dist) | `/`, `/landing`, `/login`, `/manifest.webmanifest`, `/sw.js`, `/favicon.svg` → HTTP 200, correct types; `html lang="ar" dir="rtl"` confirmed |
| CI on `main @ d7dd78f` | Build ✓ and Verify ✓ (GitHub, observed 2026-08-20) |
| Sandbox Node `v22.22.3` vs `.nvmrc` `22.23.2` | **below declared `engines ^22.23.2`** — npm tolerated it (no engine-strict); flag only, CI runs newest 22.x |

> **Update 2026-08-20 (pass 2, same session):** after Plan M11 (device-PIN throttle, +5
> tests) and M7 (admin system-errors card, +3 tests) the gate stands at **737/737 pass**,
> typecheck/lint/build green. So the 719 row above records this session's *starting*
> baseline; 737 is the current truth.

Environment limits (unchanged, honestly blocking): no browser download (Playwright CDN
reset) and no live Supabase reachability (TLS blocked) from this sandbox. Consequences are
listed as open risks, never marked verified.

## Axis-by-axis findings

### 1. Build, runtime, structure, dependencies, configuration
- Build/runtime correctness: green (table above). SPA served with deep-link rewrites (vercel.json + `_redirects` for the secondary host).
- Dependencies: pinned lockfile; React 18.3.1, vite 6.4.x, supabase-js 2.108.x. `@zxing/library@0.22.0` declares Node `>=24` (EBADENGINE) while the project pins Node 22 — install/build/tests pass; runtime verification of the scanner remains a device task; **watch on any Node-upgr­ade**. Transitive `glob@11.1.0` deprecation noted (no known vuln; audit = 0).
- Structure: legacy roots (`features`, `services`, `components`) coexist with guarded target roots (`app/engines/platform/shared`) by design; architecture-boundary tests enforce the direction (verified present in the default gate).

### 2. Frontend, routes, forms, PWA boundaries
- 24 routes behind `RequireAuth → CloudDataGate → DeviceLockGate`; `/preferences` additionally admin-only; lazy loading per route; 404 shell for unknown paths (verified in `AppRoutes.tsx` + router tests).
- Form handling is **not uniform**: 4 main forms use react-hook-form + Zod (`inventory`, `accessories`, `customers`, `reservations`); the rest use manual/HTML/service validation. Not a defect by itself; recorded as UX-consistency debt.
- Loading/empty/error/success states are contract-tested (`tests/ui-contract.test.mjs`), incl. focus trap, tap targets, 320px overflow guards.
- PWA: `generateSW`, precache of static assets only — **`runtimeCaching` absent, so no Supabase/API data is ever stored by the service worker** (verified `vite.config.ts`). Update flow is prompt-mode (verified). Offline = shell only; operational writes are online-only by product contract.

### 3. Backend business rules, jobs, failure handling
- All multi-collection writes run through `commandRunner` with exact-snapshot rollback; forced-failure suites cover reservations, money, delivery/return, sales, expenses, closing (verified in test chain).
- Money invariants: append-only ledger; deposits-as-liability separation (`booking-advance` vs `security deposit` tests); daily close blocks backdated money until reopen with reason.
- **No jobs/queues/schedulers exist by design.** Consequence: `showroom_mutations` and `client_error_events` grow unbounded, and unattended server backups do not exist — see Risks R3.

### 4. AuthN, sessions, authorization, abuse controls
- Supabase Auth (email/password) + `active profile` gate; sessions managed by supabase-js (localStorage tokens — standard for the library; CSP `script-src 'self'` narrows XSS token-theft paths).
- Server-side authorization verified in migrations: `private.is_lena_admin()` gates destructive/protected operations inside `apply_showroom_snapshot` (migration 0016, `actor_is_admin` checks); `showroom_mutations` select = admin-only; `client_error_events` insert = active users, select = admin-only; `showroom_state` fully revoked from anon/authenticated except via the RPC; uploads to private buckets require active membership (0011). First user becomes admin by migration; later users staff (documented).
- Abuse-control gaps (known, sized): no device-PIN rate limiting (offline lockout; local-only), no login lockout policy evidence, no MFA policy. PIN storage is a salted PBKDF2-SHA-256 verifier with ≥100,000 iterations enforced at read time (verified `devicePin.ts`).

### 5. Database, migrations, concurrency, backups
- Single-row `showroom_state` with optimistic `revision`, idempotency key, command name, and server validation of schema/payments/reservations (0019). Cap: `octet_length > 20971520` (20 MiB) → `LENA_SNAPSHOT_TOO_LARGE` (verified 0016).
- Deletion policy: archive-not-delete for referenced entities; codes/barcodes never reused (suites verified).
- Indexes added for hot paths (0011: payments.created_by, reservations.created_by, expenses…).
- Concurrency: revision conflict → client rehydrates; **no merge** — safe but can refuse work under simultaneous devices (documented; untested under real multi-device pressure).
- Backups: versioned full export incl. IndexedDB images, validated import with pre-replace snapshot and rollback (suites verified). Server point-in-time copies — **implemented this session** (see Remediation M1).

### 6. Integrations, timeouts, cost controls
- Only external dependency: Supabase (Auth/Postgres/Storage/Realtime) + WhatsApp deep links + device camera via ZXing. No webhooks, no third-party paid APIs, no payment rails → narrow cost/abuse surface.
- **Fixed this session (M3):** the public landing catalogue fetch had no timeout (a stalled connection could hang the visitor's loading state); now a 12 s `AbortController` guard with a fail-closed Arabic error state (+ regression tests).
- Storage uploads are best-effort with the private bucket contract (10 MiB images / 100 MiB backups; content-type allowlists verified 0011).

### 7. Security, privacy, secrets, caches
- Headers (vercel.json, verified): strict CSP (`default-src 'self'`, `connect-src` narrowed to `*.supabase.co`), `object-src 'none'`, `frame-ancestors 'none'`, nosniff, Referrer/Permissions-Policy (camera=self only), COOP. Note: HSTS is not in `vercel.json` — Vercel serves it for `*.vercel.app`; **if a custom domain is attached later, confirm HSTS at the registrar/CDN layer** (watch item, not a defect).
- Service worker caches no sensitive data (no runtime caching — Axis 2).
- Tracked secrets: only the browser-publishable Supabase URL + publishable key (`.env.production`; public-by-design); RLS is therefore the critical boundary — verified strong in migrations. No service-role key in repo.
- Privacy posture: the full snapshot (customers, money, condition photos) is readable by any active showroom user — accepted single-showroom trust boundary, documented for the owner; not least-privilege per feature.

### 8. Performance and low-end mobile
- Bundle split verified: `vendor-react` 181 KB (gzip 60), app `index` 321 KB (gzip 89), `vendor-zxing` 444 KB **lazy** (camera flow only), forms chunk 83 KB; fonts local; precache ~2.8 MB total.
- Per-command cost is O(snapshot) JSON committed to the server — bounded by the 20 MiB cap and now *measured* (M2). At realistic single-showroom sizes (≤ a few MB) this is acceptable; it is the architectural ceiling to watch, logged in Decisions D8.
- Mobile hardening is contract-tested at source level (safe areas, 16px fields, tap targets); **measured low-end-device proof stays open** (device session).

### 9. Tests, CI, monitoring, rollback, docs
- 737 Node tests (pass 2) incl. atomicity/rollback/forced-failure, financial invariants, backup round-trips, PWA build contract, RLS/migration contracts. Two conventions noted as engineering debt: many suites assert **source text** (cheap but brittle — it caught the retired-workflow coupling this session, which is the pattern working), and **no coverage metric** exists.
- CI: Build + Verify on pushes/PRs (green on main). E2E (Playwright, desktop + 360×740 + 390×844) runs in Verify with **mocked** network (verified README vs workflow); sandbox cannot run it (browser CDN blocked).
- Monitoring: `client_error_events` + (new, M7) admin read-only count card on `/preferences` — sufficient signal exists and is now visible without the console; external alerting stays an ops decision.
- Rollback: local exact-snapshot rollback per command; bad import/reset recover via validated backups + (new) server copies; frontend/db rollback runbook not yet written (Plan M8).
- Docs: rich; historical audits partially stale → archive batch pending (Plan M9).

## Prioritized confirmed risks

| ID | Priority class | Risk | Status |
| --- | --- | --- | --- |
| R1 | data loss | No point-in-time recovery on server (single latest snapshot; device-only backups) | **FIXED (M1, verified)** — copies on every export, retention 20, admin restore; live environment drill still owed |
| R2 | outage | Silent write-outage path at the 20 MiB snapshot cap; generic operator error | **FIXED (M2, verified)** — gauge + thresholds (50/80%) + pre-commit guard + mapped server rejection + daily telemetry ping |
| R3 | data loss/ops | No retention/PITR/scheduled-backup evidence on live Supabase (`showroom_mutations`, `client_error_events` unbounded) | OPEN — owner/Supabase-console action (Plan M4/M5 with recommended SQL; reversible) |
| R4 | credentials | Admin provisioning/offboarding/MFA performed manually in Supabase console; single-admin-compromise impact high | OPEN — owner action with guide (Plan M6) |
| R5 | correctness proof | Camera/barcode, printing, PWA install/offline, and live backend untested on real devices (release tag 5.06 blocked on exactly this) | OPEN — owner device session (Plan M10) |
| R6 | abuse | No device-PIN lockout/backoff; no login throttling evidence | **PARTIALLY FIXED (M11, verified)** — device-PIN exponential backoff (5 tries → 30s…480s cap, pre-derivation refusal, no-backup-leak) shipped and test-proven; hosted-account login throttling is Supabase-platform-managed → evidence item folded into Plan M10's live session |
| R7 | dependency | `@zxing` Node≥24 declaration vs Node 22 runtime; `glob` deprecation | WATCH — do not upgrade Node past documentation without scanner re-verification |
| R8 | debt | Non-uniform form validation; 1083-line reservation service; no coverage metric | OPEN — architecture phases own these (no rewrite-by-preference, per policy) |
