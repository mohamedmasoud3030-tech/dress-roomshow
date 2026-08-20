# Remediation Plan — LENA (consolidated)

> 2026-08-20 · Branch `arena/01a01f12-lenadress` · Owner-directed consolidation milestone.
> **Document availability note (verified):** of `01_PROJECT_DISCOVERY.md`…`06_TEST_RELIABILITY_AUDIT.md`
> only `05_PERFORMANCE_TECH_DEBT_AUDIT.md` exists (authored this session). Their conceptual coverage
> is provided by the repo's real audit corpus, which is what this plan consolidates:
> `docs/archive/FULL_PROJECT_AUDIT.md`, `docs/archive/FUNCTIONAL_CORRECTNESS_AUDIT.md` (FC-01…13), `docs/archive/TECH_DEBT_AUDIT.md`,
> `PROJECT_DEFECTS.md` (DEF-001…031), `docs/archive/PRODUCT_EXPERIENCE_AUDIT.md` (PX-01…16),
> `docs/UX_HARDENING_REPORT.md`, `TECHNICAL_HEALTH_REPORT.md` (R1–R8),
> `TECHNICAL_REMEDIATION_PLAN.md` (M1–M11), `05_PERFORMANCE_TECH_DEBT_AUDIT.md` (D1–D7),
> `LAUNCH_CLOSING_REPORT.md` (L-/A- registers).
> Duplicates are merged into one ID each (e.g. A1 = DEF-004 ∪ FC-13).
> Labels: **VERIFIED COMPLETE / IMPLEMENTED BUT NOT VERIFIED / BLOCKED / NOT STARTED**.
> Gate baseline for every below: 754/754 tests, typecheck, lint, build — all PASS (2026-08-20).

## A — Critical: security / money / data-loss / outage

| ID | Merged finding | Evidence today | Status | Action |
| --- | --- | --- | --- | --- |
| A1 = DEF-004 ∪ FC-13 | Audit trail not append-only for staff sessions | Migration **0019 written** (restores audit protection); cannot reach live DB to confirm application | **BLOCKED — production migration; owner approval required** | Apply 0019 during supervised session with backup-first (M1 copies exist) |
| A2 = DEF-005 ∪ FC-12 | RPC accepts unvalidated business payloads | Same migration 0019 adds snapshot validation; same application gap | **BLOCKED — same gate as A1** | Same action |
| A3 = DEF-002 residual ∪ FC-11 | Local result shown before server acknowledgment across sync commands | Architectural rewrite risk; deliberately deferred per PROJECT_DEFECTS record | **BLOCKED — architectural decision recorded; revisit only with multi-device pressure evidence (PD register)** | None now |
| A4 = M4 | Unbounded `showroom_mutations` / `client_error_events` growth | No retention job exists on live project | **BLOCKED — OWNER-DEFERRED (2026-08-20): no deletion without operational reason + written policy; backups are not a justification** | Parked |
| A5 = M6 | Admin MFA + account lifecycle | **Re-scoped with evidence 2026-08-20:** in-app staff panel + runbook VERIFIED COMPLETE (RM-3); console user-creation walkthrough = owner task from runbook §9.2; **true TOTP MFA needs an app enrollment screen → NOT STARTED (future app task), no console shortcut exists** | **BLOCKED (console walkthrough) / NOT STARTED (MFA screen)** |

## B — Core journeys / build & runtime blockers

| ID | Merged finding | Status |
| --- | --- | --- |
| B1 = PX-01…PX-04 ∪ PX-06,10,11,13 ∪ DEF-024…031 | Public contacts hygiene, booking dead-end, loading copy, login recovery, permission denial, danger-zone, titles, glossary | **VERIFIED COMPLETE** (re-verified 2026-08-20 in code + suites) |
| B2 = 05:D1 | Cloud hydrate/commit waits bounded only by browser TCP timeouts — wedged Wi-Fi = infinite spinner | **→ RM-1 (this turn)** |
| B3 = M11, M7 | PIN guess throttle; admin errors visibility | **VERIFIED COMPLETE** (2026-08-20) |

## C — Data / auth / integration correctness

| ID | Merged finding | Status |
| --- | --- | --- |
| C1 = FC-01…FC-10 ∪ DEF-012…DEF-023 | Close-with-accessory-out, no-show exit, cancel-after-advance refund, service conflicts, public-profile publication, stocktake scope, future appointments, contract-line audit, returned-balance reminders, waitlist handoff | **VERIFIED COMPLETE** (recorded in PROJECT_DEFECTS §3; pinned by workflow suites) |
| C2 = DEF-007 | Backup-export audit not a cloud command | **VERIFIED COMPLETE** (passes through command runner; M1 wiring kept the boundary) |
| C3 = DEF-008 | Private cache after sign-out | **VERIFIED COMPLETE** (auth regression proves cache clear w/o PIN loss) |
| C4 = DEF-009 | Staff account lifecycle | **NARROWED 2026-08-20:** in-app activation panel exists (verified) — console Auth-user creation + MFA remain **BLOCKED (owner console / future app task)**; runbook written (RM-3) |
| C5 = M1, M2, M3 | Server backup copies; snapshot-size guard; landing fetch timeout | **VERIFIED COMPLETE** |

## D — Regression protection

| ID | Finding | Status |
| --- | --- | --- |
| D-a = M8 appendix | No coverage baseline | **→ RM-5 evaluation this turn (baseline only, never gating)** |
| D-b | DOM-level operational verification layer | **VERIFIED COMPLETE** (`tests/helpers/jsdom-react.mjs` + `walkthrough-dom` 6 tests) |
| D-c | Localization/consistency enforcement (ar-OM lock, glossary, bidi) | **VERIFIED COMPLETE** (`localization-policy` 4 + `product-ux-copy` 4) |

## E — Domain / PWA / deployment / UX / performance

| ID | Finding | Status |
| --- | --- | --- |
| E1 = 05:D4 | `date-fns` imported by zero modules — manifest noise | **→ RM-2 (this turn)** |
| E2 = UX-M1, UX-M3 | Setup checklist; staff support card | **VERIFIED COMPLETE** (2026-08-20) |
| E2b = UX-M2, UX-M4 | Preferences sub-navigation; landing mobile shortening | **NOT STARTED** (roadmap sequence: verify once with M10 visuals, not twice) |
| E3 = M9 | Stale historical audits mixed into active docs | **→ RM-4 (this turn)** |
| E4 = 05:P3 | Font excess inside precache | **NOT STARTED** (defer to M10 measurement) |

## F — Lower-value debt (queued, no action without touching the area)

M8 typing pass on `reservationCommands.ts` (whole-file eslint-disable) · `reservation.service.ts`
1,114-line split (façade pattern documented) · localization residue L-1/L-2 (shared date-time preset,
formatter alias) · TECH_DEBT_AUDIT low-priority rows. **All NOT STARTED by deliberate sequencing.**

## Executed now (this turn, autonomous-safe class)

| Milestone | Outcome | Evidence | Status |
| --- | --- | --- | --- |
| RM-1 | Bounded cloud wait (hydrate + commit) armed via manual `AbortController` (15 s), aborts mapped to `LENA_CLOUD_TIMEOUT` with idempotency-honest retry wording; no more wedged-Wi-Fi infinite spinner | `showroomCloudState.ts` (both call sites), `tests/cloud-timeout.test.mjs` 3/3 (real-timer abort, disarm, classification, wiring contracts) | **VERIFIED COMPLETE** |
| RM-2 | Removed `date-fns` (zero-import dependency) | manifest+lock diff; bundle grep shows zero traces; full chain 757/757 | **VERIFIED COMPLETE** |
| RM-3 | Arabic ops runbook §9: account model, add-staff flow, offboarding, password recovery, honest MFA status (console-only claim corrected — TOTP needs an app enrollment screen, logged as future item), shared-device sign-out behavior | `docs/OPERATIONS_GUIDE.md` §9.1–9.6 | **VERIFIED COMPLETE (docs)** |
| RM-4 | Archived 7 stale audits/phase reports to `docs/archive/` with banners + index README; path references in 5 active docs repointed; no test references existed (verified) | `docs/archive/*`, diff is moves-only | **VERIFIED COMPLETE** |
| RM-5 | Coverage baseline convention: native per-suite measurement (single-process rejected — isolation), first row `workflow-commands` 60.22% lines; never gating | `docs/TEST_COVERAGE_BASELINE.md` | **VERIFIED COMPLETE (baseline recorded)** |

**New in-pass verification corrections (evidence beats audit age):**
- DEF-009 ("admin has no activation screen") is **stale**: `AccountManagement.tsx` already lists
  profiles and toggles role/is_active with admin self-lockout protection. Residual = console-side
  Auth-user creation + MFA evidence → documented; C4 narrowed accordingly.
- "MFA enable ≈ 15 min console task" (earlier plan note) is **incorrect**: Supabase TOTP MFA for
  email users requires an in-app enrollment UI. M6 re-scoped honestly (C4/A5).

## Owner approvals pending (single consolidated question, reported in Arabic chat)

- **A1+A2:** approve supervised application of migration **0019** (audit append-only restore +
  snapshot validation) to the live Supabase project during the M10 device session, with a fresh
  server backup copy taken immediately before. Recommended: **YES**.
