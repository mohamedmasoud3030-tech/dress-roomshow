# AGENT_HANDOFF — LENA · Dress Roomshow

**Handoff date:** 2026-08-20 · **Session branch:** `arena/01a01f12-lenadress` · **Remote tip:** `806d9ec` (+ handoff commit on top)
**Gate at handoff (fresh, 2026-08-20):** 757 tests pass / 0 fail · `tsc -b` clean · `eslint .` clean · `vite build` OK
**Owner language contract:** chat in **simple Arabic**; code, paths, and durable technical docs in **English**. Owner is non-technical — never ask for technology choices; ask only for credential/paid/production/destructive/legal/major-product decisions, as **one yes/no question with a recommendation**.

---

## 1. Product purpose, domain, users, roles

- **What:** "LENA — Dress Roomshow", an occasion-wear **showroom operating system** for **one Omani showroom**: rental **and** sale of dresses/accessories — reservations (booking advance vs **security deposit**), payments, delivery/return with condition-photo evidence, expenses, daily closing, reports, reminders/WhatsApp templates, landing page with public dress browsing.
- **Domain rules that are law** (see `AGENTS.md`, `BUSINESS_MODEL.md`): append-only money records; deposits are liabilities; archive-not-delete; every operation carries an audit record; multi-collection commands are atomic; production first run starts empty.
- **Surface:** **Arabic-only, RTL, locale ar-OM** (Arabic-Indic digits via CLDR; currency via canonical `formatMoneyOMR`; glossary term «العميلات» is binding). PWA (workbox precache) + Tauri desktop shell.
- **Users/roles:** `profiles` table with `role` (`admin` | staff) + `is_active`. Admin manages accounts in-app (`AccountManagement.tsx`); staff run daily operations. Device-level PIN lock gate with throttle (M11). Public (anonymous) visitors can only read landing dresses/profile (migrations 0013/0020).

## 2. Current architecture and important paths

- **Frontend:** Vite + React + TypeScript SPA in `src/` — feature modules in `src/features/*` (dresses, reservations, payments, expenses, delivery-return, sales, reports, reminders, preferences, dashboard, sync, observability, auth…), shared platform in `src/platform/*` (images, storage, backups), app shell/router in `src/app/`, Supabase client in `src/lib/supabaseClient.ts` (env names only: §8).
- **Local-first + cloud sync:** local state stores per feature; cloud = single-row `public.showroom_state` (id `main`, `snapshot` jsonb, `revision`) written **only** through RPC `public.apply_showroom_snapshot(bigint expected_revision, jsonb snapshot, text idempotency_key, text command_name)`; command log `public.showroom_mutations` (bounded, 0017); admin gating via `private.is_lena_admin()` / `private.is_active_lena_user()` (0011). Cloud backup copies: bucket `backups` (0011) + `src/platform/backups/cloudBackupCopies.ts` (retention 20).
- **Safety guards (client):** RM-1 cloud call timeout 15s (`LENA_CLOUD_TIMEOUT`) in `src/features/sync/showroomCloudState.ts`; M2 snapshot size cap 20 MiB client+server (`LENA_SNAPSHOT_TOO_LARGE`, 0016).
- **Migrations:** `supabase/migrations/0001…0020`. **Official apply path = Supabase Dashboard → SQL Editor, pasting the migration file verbatim** (no supabase CLI, no migration CI — verified 2026-08-20).
- **Docs spine:** `AGENTS.md` (repo law + source-of-truth order), `REMEDIATION_PLAN.md` (consolidated audit register A1–A5), `TECHNICAL_REMEDIATION_PLAN.md` (M1–M11), `LAUNCH_CLOSING_REPORT.md` (assumption register A-1…A-8), `docs/OPERATIONS_GUIDE.md` (§9 account lifecycle), `docs/EXECUTION_CHECKLIST.md` (session records), `docs/MIGRATION_0019_APPLICATION_RUNBOOK.md`, `docs/TEST_COVERAGE_BASELINE.md`, `docs/archive/` (7 historical audits + README).
- **Tests:** Node `node:test` + `tsx`, suites in `tests/*.test.mjs`, jsdom harness `tests/helpers/jsdom-react.mjs` (must be imported first in DOM suites). Coverage convention: per-suite `--experimental-test-coverage` (single-process rejected for isolation).

## 3. Decisions made during this session (2026-08-20) and rationale

| Decision | Rationale |
|---|---|
| Checkpoint-commit the entire green tree (`6ebc3dc`) before any DB talk | Owner requirement: never approach production DB with an unsaved working tree |
| 0019 must be applied **via dashboard SQL editor from the migrations file**, not ad-hoc SQL | No CLI/CI migrator exists; keeping the file = official record preserves migration history fidelity |
| A1 proof probe uses **JWT emulation** (`set local role authenticated; set local request.jwt.claims …`) | RPC refuses anonymous callers (`LENA_AUTH_REQUIRED`) — a plain SQL-editor call cannot exercise the non-admin guard |
| A1/A2 stay **BLOCKED**, not VERIFIED | Sandbox cannot reach Supabase (TLS blocked, re-verified 2026-08-20); live proof probes are the only acceptable evidence |
| Owner deferred the supervised session ("لاحقًا", 2026-08-20) | Recorded in `REMEDIATION_PLAN.md`; instrument stays ready |
| Destructive-op scan of 0019 documented (no DROP/DELETE/TRUNCATE/ALTER-DROP; only re-creates its own trigger) | Owner asked for an explicit irreversibility statement before any apply |
| Backup restored to "recovery only" framing | Owner standing rule: backups never justify risk; M4 stays deferred |

## 4. Work completed — VERIFIED (with evidence)

| Item | Evidence (2026-08-20, fresh) |
|---|---|
| Whole milestone series RM-1…RM-5 + M1/M2/M3/M7/M11, file/media guards, localization lock, dashboard setup+support cards, walkthrough harness | **757/757 tests pass**, `tsc -b`, `eslint .`, `vite build` — all run fresh this handoff; suites listed in `package.json` (`test:*` chain) |
| Checkpoint commits exist and content preserved remotely | `git ls-remote`: branch tip = `806d9ec`; per-file SHA-256 compare of 4 key files vs GitHub `806d9ec`: **identical** (REMEDIATION_PLAN.md, runbook, navigation.ts, cloud-timeout test) |
| 0019 static verification | File read in full; destructive scan clean; 0016 literal byte-match; `private` schema from 0011; RPC signature/single-row `showroom_state`; `is_lena_admin` null-safe; RPC auth gate shape — all re-read this handoff |
| Git hygiene | No temp/debug artifacts in session diff (no `console.log`/`debugger` additions); 7 old audits are git **renames** into `docs/archive/`, not deletions |

## 5. Implemented but NOT verified (honest register)

- **Migration 0019 (A1 audit append-only restore + A2 server payload validation):** written, statically verified, **not applied to the live project**. Status: **BLOCKED** on the owner's supervised session (`docs/MIGRATION_0019_APPLICATION_RUNBOOK.md`).
- **Pixel/camera/print/PWA-install/live journeys** (assumption register A-1…A-8 in `LAUNCH_CLOSING_REPORT.md` §4): no browser/camera/printer/TLS in sandbox — **BLOCKED-EXTERNAL**, pending the M10 real-device session.
- **Login-throttling / server perf profile (§P4):** blocked until M10.

## 6. Known defects and risks

1. **A1/A2 unapplied:** until 0019 runs, non-admin sessions lack the restored server-side append-only guarantee on audit collections, and malformed financial payloads are not rejected server-side. Client guards exist but are not the authoritative boundary.
2. **A3 (DEF-002∪FC-11):** no server acknowledgment for sync commands — architectural, deliberately deferred.
3. **Environment instability (new, observed 2026-08-20):** sandbox rolled back local git refs/objects between turns (working tree kept content); `node_modules` evaporates between turns. Remote is source of truth — always `git ls-remote` first, `npm ci` when needed.
4. **Divergent parallel branch:** `arena/01a00fc5-lenadress` (tip `4ded657`) is **ahead 3 / behind 3** vs this session's tip — another session's work; do **not** merge/copy without owner coordination.
5. **Stale preview process** may hold port 4173 across turns but serves `dist/` fresh (verify via asset hash vs `dist/index.html`).
6. `.env.production` is **intentionally tracked** and contains the publishable Supabase anon key (by design, RLS-protected); names in §8. Never print values; changing this practice is an owner-level decision.

## 7. Database / migrations / environment changes

- **This session:** **zero** live DB changes (blocked). Migration 0019 file exists since the previous milestone; statically verified twice; see runbook.
- **Pending live apply:** `0019_audit_and_snapshot_validation.sql` only. U1 hardens the RPC's append-only list (adds `audit-log`, `audit`, fail-closed on drift), U2 adds `private.validate_showroom_snapshot()` trigger (financial invariants, `LENA_INVALID_*` codes), U3 revokes RPC from `public`/`anon`. Nothing destructive; idempotent; rollback in runbook §6.
- **Applied historically (per repo/docs):** through 0018 + 0020 (manual dashboard application; `supabase_migrations.schema_migrations` may not exist — runbook Q1.1 handles both).

## 8. External providers and environment-variable names (no values)

| Provider | Usage | Env / config names |
|---|---|---|
| Supabase (`ktmizdznbdwvalmmfvfc` project) | Auth, PostgREST RPC, Storage (`backups` bucket), Realtime | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` (read in `src/config/env.ts`, `src/lib/supabaseClient.ts`, `src/features/observability/clientObservability.ts`) |
| Vercel (`vercel.json`) | Static hosting for `dist/`, SPA rewrite, CSP/security headers | none (dashboard-managed) |
| GitHub | Repo, CI (`verify.yml` on push to main + PRs; `build.yml`) | Actions secrets (not in repo) |

No payment providers, no live payment flows.

## 9. Commands (confirmed from repo this handoff)

```bash
npm ci                 # install (node_modules may vanish between sandbox turns)
npm run dev            # Vite dev server
npm test               # full suite chain (757 tests at handoff)
npm run typecheck      # tsc -b
npm run lint           # eslint .
npm run build          # tsc -b && vite build → dist/ + sw.js (141 precache entries)
npm run preview        # serve dist/
node --import tsx --test tests/<suite>.test.mjs   # single suite
```
Node: `.nvmrc` = 22.23.2; sandbox 22.22.3 tolerated.

## 10. Deployment / production status

- **Backend live:** Supabase project in production use with real showroom data (single-row state, revision baseline recorded via runbook Q1.5 when session runs). Hardened through 0018+0020; **0019 pending**.
- **Frontend:** built (dist green); Vercel config present; actual production deploy/URL = owner-managed (not verifiable from sandbox).
- **Launch posture:** `LAUNCH_CLOSING_REPORT.md` — launchable after: 0019 session proofs (P0/P-A1/P-A2a/P-A2b/P-RLS), M10 device session closing A-1…A-8, M6 console walkthrough (OPERATIONS_GUIDE §9.2, ~15 min).

## 11. Owner approvals / accounts / credentials still required

1. **Supervised 0019 session (BLOCKED, deferred 2026-08-20):** owner at Supabase Dashboard SQL Editor, pasting my queries and returning outputs. No device needed, ~15 min.
2. **M10 device session:** owner's real device (camera/printer/PWA install) with their login; I drive a checklist.
3. **M6 console walkthrough:** owner's Supabase dashboard access (OPERATIONS_GUIDE §9.2).
4. **Credentials:** never shared in chat, never stored in repo beyond the intentional publishable key. If `gh`/`git` auth breaks, the owner reconnects GitHub in Arena.

## 12. Next three milestones (prioritized, with acceptance criteria)

1. **Supervised 0019 application (A1+A2).** Acceptance: runbook Q1.3 = `READY_FOR_0019` pre-apply; apply returns no error; proofs pass — P-A1 `LENA_APPEND_ONLY_VIOLATION`, P-A2a `LENA_INVALID_PAYMENT`, P-A2b `UPDATE 1`, P0 state+trigger present with unchanged revision, P-RLS landing+save+daily-close OK → flip A1/A2 to **VERIFIED COMPLETE** in REMEDIATION_PLAN.md.
2. **M10 real-device session.** Acceptance: every A-1…A-8 item either evidenced (pixel 390/360, camera scan, print, PWA install, full journeys, M1 restore drill, M11 lockout UX, throttling evidence, perf §P4) or explicitly re-labeled with owner sign-off.
3. **M6 console walkthrough + launch sign-off.** Acceptance: OPERATIONS_GUIDE §9.2 checklist fully evidenced; final go/no-go recorded in LAUNCH_CLOSING_REPORT.md.

## 13. Warnings — do not overwrite or weaken

- **Never edit applied migrations** (0001–0018, 0020). 0019 is frozen the moment it is applied.
- **Never weaken tests, RLS, or security gates** to make a check pass (AGENTS.md § laws; coverage convention documented).
- **`docs/archive/` is preserved history** (7 audits + README banner) — do not delete.
- **Localization locks are contractual:** ar-OM only; no bare «العملاء» («العميلات» is binding); `formatMoneyOMR` canonical; bidi `dir="ltr"` for phones/emails/tokens; no new physical CSS classes (logical-forward).
- **Business invariants:** append-only money, deposits are liabilities, archive-not-delete, audit-with-operation, atomic multi-collection commands, production first run empty.
- **M4 stays owner-DEFERRED** — never re-propose deletion without an operational reason + written retention policy; backup existence is never a reason to delete.
- **Branch discipline:** work only on `arena/01a01f12-lenadress`; the parallel branch `arena/01a00fc5-lenadress` diverged — reconcile only with owner coordination.
- **Environment ritual each session:** `git ls-remote` first (remote is truth), `npm ci` if `node_modules` missing, re-run the gate before claiming green.

---

## تكملة — إغلاق ناقصَين من §9 (صفحات القطع + العنوان التفصيلي)

- **صفحة تفاصيل عامة مستقلة لكل قطعة** على `/piece/:code` (عامة مثل `/landing`، خارج بوابة الدخول).
  تنشئها بطاقات المعروض وأسماؤها ونافذة العرض السريع عبر `src/pages/landing/piecePath.ts`،
  وتقرأ نفس الإسقاط العلني `loadLandingInventory` (لا مسار بيانات ثانٍ)، وتعرض السعر بعد الخصم
  والمقاس واللون والكود وأزرار واتساب الجاهزة بالكود، مع حالة «لم تعد متاحة» صادقة وقطع مشابهة.
- **العنوان التفصيلي وربط الخريطة:** النوع `LandingContact` صار فيه `addressLines` و`mapQuery`،
  الدمج المقوّى في `landingProfile.repository.ts` يسمح بهما ويسقط الشاذ، صفحة التواصل تعرض السطور
  وتفتح الخريطة بعبارة البحث المخصصة، وشاشة «ملف المعرض التعريفي» في الإعدادات تُحرر كل ذلك
  وتُطبّع القيم الفارغة لتسقط على الافتراضيات. المزامنة السحابية تمرّر الحقول تلقائياً (trigger passthrough).
- **التحقق:** `typecheck` ✔ · `lint` ✔ · الاختبارات **785/785** (أُضيفت 5: الموجّه، رابط القطعة،
  التحقق من مسار القطعة العام، دمج حقول العنوان، تحرير العنوان من الشاشة).
- **لم يُكسر أي سلوك قائم:** بوابة الزباين، نافذة العرض السريع، القلب/الاختصارات، أزرار واتساب،
  واختبارات front-door كما هي.
- **منوط بالمالكة:** تعبئة سطور العنوان الحقيقية (منطقة/شارع/مبنى) من شاشة الإعدادات — الكود جاهز
  ويعرض ويربط أي قيمة تحفظها فوراً.
