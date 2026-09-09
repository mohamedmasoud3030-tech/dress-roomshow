# Technical Remediation Plan — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress` · Companion to `TECHNICAL_HEALTH_REPORT.md`
> and `TECHNICAL_DECISIONS.md`. Ordered by risk class: credentials/unauthorized access,
> data loss, money, outage → core correctness → data/auth/integrations → regression
> protection → PWA/performance/operations → debt.
> Completion labels: **VERIFIED COMPLETE** = failure no longer reproduces + intended
> behavior observed + tests green + no introduced regression in the full gate.
> **BLOCKED-EXTERNAL** = needs owner account, production, payment, or a real device.

## Executed milestones (this session)

### M1 — Server point-in-time backup copies — VERIFIED COMPLETE (sandbox)
- Problem → root cause: bucket `backups` provisioned (0011) but unwired; server held only
  the latest snapshot (code inspection + `PROJECT_STATUS.md` risk #1 re-verified).
- Change: see Decisions D1/D7. Files: `src/platform/backups/*`, `backupExport.service.ts`,
  `PreferencesPage.tsx`, `DailyClosingPage.tsx`, `tests/cloud-backup-copies.test.mjs`,
  `package.json` gate wiring.
- Gate evidence: 12 new tests; full chain 710→**719 green** (after M2/M3), lint/typecheck/build green.
- Runtime journey: export paths exercised by suites; **live bucket drill = BLOCKED-EXTERNAL**
  (sandbox cannot reach Supabase) → folded into M10's device/live session checklist.

### M2 — Snapshot size gauge + pre-commit guard — VERIFIED COMPLETE (sandbox)
- Problem → root cause: silent 20 MiB write-outage path; no measurement, generic error.
  Server cap re-verified at `0016:334-335`.
- Change: Decisions D2/D6. Files: `src/features/sync/snapshotSizeMetrics.ts` (new),
  `showroomCloudState.ts`, `clientObservability.ts` (ordering), `PreferencesPage.tsx`
  (admin gauge card), `tests/snapshot-size-guard.test.mjs`, gate wiring.
- Regression check: full gate green; `LENA_INVALID_COMMIT_RESPONSE` message preserved
  verbatim; architecture boundaries untouched.
- Runtime journey: commit/hydration paths measured by unit level; visual confirmation of
  the admin card on a live session = part of M10.

### M3 — Public catalogue fetch timeout — VERIFIED COMPLETE (sandbox)
- Problem → root cause: no timeout on the landing fetch (`landingDress.repository.ts`).
- Change: Decision D3. Files: repository + two tests in `tests/landing-inventory.test.mjs`.
- Regression check: existing 12 landing tests unchanged and green; suite now 14/14.

### M3.1 — Repo hygiene — VERIFIED COMPLETE
- postcss dedup (D5, byte-identical CSS proof) · dead Tauri CI retirement (D4) with the
  Node-22 witness test updated (invariant preserved on the two live workflows).

### M11 — Device-PIN abuse throttle — WITHDRAWN: the lock screen it hardened no longer exists

> **حُذف هذا العنصر بالكامل بطلب المالكة:** شاشة قفل الجهاز بـ PIN أُزيلت من المنتج،
> ومعها `src/features/device-lock/` و`src/platform/security/` و`tests/device-pin.test.mjs`.
> ما يلي سجل تاريخي للعمل الذي أُنجز ثم أُلغي — **لا يُمثّل حالة الكود الحالية**، ولا يجوز
> إعادة إنشائه من تاريخ Git.
> الحاجز الفعلي اليوم: تسجيل دخول Supabase + صلاحيات RLS على الخادم + تفعيل الحسابات
> يدوياً بيد المديرة فقط (راجعي `docs/OPERATIONS_GUIDE.md`).

<details>
<summary>السجل التاريخي (أُنجز ثم حُذف بطلب المالكة)</summary>

- Problem → root cause: the 6-digit device PIN verifier (PBKDF2-SHA256, 210k iterations)
  had no attempt limiting at all — a borrowed phone + obvious guesses (123456, birth
  years) was an unbounded free oracle (`devicePin.ts` code inspection).
- Re-sequencing rationale: the milestone was queued behind M10 to verify lockout UX on a
  real device once. The security core is fully sandbox-verifiable, so the protection
  ships now and only the **UX confirmation** (countdown readability, owner recovery
  reflex) stays on M10's device checklist — the risk window closes ~immediately instead
  of waiting for a device session.
- Change: Decision D8. Files: `src/platform/security/devicePin.ts` (+ throttle state,
  `verifyDevicePinWithThrottle`, lockout exports), `src/platform/security/index.ts`
  (barrel), `src/features/device-lock/DeviceLockGate.tsx` (countdown banner, blocked
  submit, attempts-remaining copy), `tests/device-pin.test.mjs` (suite 4→9).
- Behavior contract: 5 consecutive wrong attempts → temporary lock with exponential
  backoff 30s→60s→120s→240s→cap 480s; locked attempts are refused before any key
  derivation (no oracle); success resets the failure counter but NOT the escalation
  level (bounded by the 8-minute cap — chosen over full reset so a borrower cannot
  farm short 30s locks, while the owner's self-lockout stays bounded); configuring a
  new PIN resets everything; throttle record is device-local and neither enters
  backups/imports nor survives reset — exactly the PIN verifier's own semantics.
- Gate evidence: 5 new tests (9/9 suite); full chain **737 green**; typecheck/lint/
  build PASS. Review-pass caught and fixed: a locked attempt also wrote the lockout
  text into the persistent red `message` slot → stale "retry after N seconds" banner
  after expiry; now the live-countdown amber `role="alert"` banner owns that state.

</details>
- Remaining risk: determined attacker with device access can still wait out locks —
  residual accepted; the verifier cost + exponential cap makes quick-guess attacks die.
  Hosted-account (email) login throttling is Supabase-platform-managed → evidence item
  in M10's live session.

### M7 — Minimal alerting channel ("أخطاء النظام" count card) — VERIFIED COMPLETE (sandbox)
- Problem → root cause: `client_error_events` collected silently since 0016; the only
  way to know errors accumulate was opening the Supabase console — invisible to support.
- Change: Decision D9. Files: `src/features/observability/SystemErrorsSummary.tsx`
  (new, read-only), mounted on `/preferences` (admin-only route, verified against
  `AppRoutes.tsx`), `tests/system-errors-summary.test.mjs` (3), gate wiring.
- Behavior contract: single round trip `count:'exact'` + newest `created_at` only
  (no row payloads ever travel into the UI); session + config + network failures all
  degrade to a calm "unavailable" state; manual refresh button; guidance copy points
  the owner to report with the app version — deliberately NOT a second log viewer.
- Gate evidence: 3 new tests; full chain **737 green**; typecheck/lint/build PASS.
- Remaining risk: count-level visibility only (row browsing stays in the console by
  design); a weekly-review runbook line is queued with M6's ops section.
- Live rendering of the card on the owner device → folded into M10's checklist.

## Queued milestones (with exact next actions)

### M4 — Retention for `showroom_mutations` / `client_error_events` — OWNER-DEFERRED (2026-08-20)
- Why: tables are append-only with no retention job; unbounded growth on the live project.
- **Owner decision (binding, 2026-08-20): DO NOT execute any deletion now.** Deferred until
  (a) a clear operational reason exists (measured size/perf/cost pressure) AND (b) an
  explicit retention policy is owner-approved in writing. The existence of M1 server backup
  copies is explicitly NOT accepted as justification for deleting records.
- Status: parked, zero code impact. Reopen only with an owner-approved policy document.

### M5 — Unattended scheduled server backup — BLOCKED-EXTERNAL (owner/infra decision)
- Why: M1 copies on export; a truly unattended daily copy needs server-side scheduling
  (pg_cron → `storage` insert is non-trivial; realistically an Edge Function + cron hitting
  a storage-signed writer). This is the residual of checklist DEFERRED-12.09.
- Recommended decision: **defer** until M1 proves its value in operation (it covers the
  daily-close ritual already); revisit after 30 days of copy coverage data.
- Cost: Edge Function on free tier is fine; engineering ≈ 1 milestone with tests.

### M6 — Admin account lifecycle + MFA evidence — BLOCKED-EXTERNAL (owner console actions)
- Why (Health R4): provisioning/offboarding/password reset happen in the Supabase console
  without a documented runbook; no MFA policy evidence.
- Next action (owner, ~15 min): follow the console steps to enable MFA for the admin
  account; I will add the Arabic runbook section to `docs/OPERATIONS_GUIDE.md` next turn
  (repo-side part is safe and unblocked).
- Acceptance: owner completes add/disable/reset from the runbook unaided; MFA enabled
  screenshot/conf­irmation stored privately (not in repo).

### M7 — ~~Minimal alerting channel~~ — VERIFIED COMPLETE (moved to Executed, this session)
- Shipped: read-only "أخطاء النظام" count card on `/preferences` (Decision D9).
- Carried-over residue (not blocking): add the weekly manual review line to
  `docs/OPERATIONS_GUIDE.md` together with M6's runbook section.

### M8 — Regression-protection hardening — OPEN (routine, safe)
- Add coverage measurement (node:test `--experimental-test-coverage` is Node-22 native —
  zero new dependency), record a baseline table in `docs/` without gating on it yet.
- Gradually convert the most load-bearing source-regex contracts into behavioral tests
  where a seam exists (precedent: this session's storage/DI seams).
- Rollback runbook (frontend + migration) in `docs/OPERATIONS_GUIDE.md`.

### M9 — Historical docs archive batch — OPEN (routine, safe)
- Move superseded audits to `docs/archive/` with a banner; repoint textual references
  (checklist/LAUNCH_PLAN §1 mention). Kept out of today's diff on purpose (AGENTS.md §14).

### M10 — Real-device + live-backend evidence session — BLOCKED-EXTERNAL (owner devices)
- The release tag (5.06) stays blocked until recorded in `docs/RUNTIME_QA.md`:
  phone captures at 390×844 and 360×740 per route; camera scan + manual fallback;
  contract/invoice/labels printing; PWA install + offline shell + update prompt; one full
  live journey (login → customer → reservation → payment → delivery → return → close);
  **plus new session items: one M1 server-copy restore drill and the M2 gauge visible on
  the admin screen.**
- I will drive the checklist live; the owner only operates the shop devices.
- Session items accumulated for M10 so far: M1 server-copy restore drill, M2 gauge on
  the admin screen, M7 errors card rendering, M11 lockout countdown readability +
  owner recovery reflex, hosted-account login throttling evidence (Supabase dashboard).

### M11 — ~~Device-PIN backoff~~ — VERIFIED COMPLETE (moved to Executed, this session)
- Shipped ahead of M10 as a sandbox-verifiable security fix (Decision D8);
  only the on-device UX confirmation of the lockout countdown remains queued,
  folded into M10's checklist.

## Watch list (no action now)

- `@zxing/library` Node ≥24 declaration vs Node 22 runtime (R7); `glob` deprecation.
- HSTS confirmation if a custom domain is attached (vercel.json has none; platform covers
  `*.vercel.app`).
- Reservation service file size and form-validation uniformity — owned by architecture
  phases; do not start casually.
- Sandbox Node (22.22.3) below `engines ^22.23.2` — CI is authoritative; keep in mind when
  reading any Node-sensitive failure here.

## Exit criteria for this plan

All M-items either **VERIFIED COMPLETE** with gate evidence or explicitly reclassified with
owner-visible reasons; release tag 5.06 unblocked; `PROJECT_STATUS.md` residual risks #1–#3
each answered by a control in production (copies + drill, live migration proof, gauge).
