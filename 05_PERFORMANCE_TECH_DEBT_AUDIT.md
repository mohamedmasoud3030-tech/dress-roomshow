# 05 — Performance & Technical Debt Audit — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress` · **READ-ONLY pass — nothing was optimized,
> upgraded, removed, or refactored in this stage.**
> Method: production build baseline + static topology + dependency/lockfile inspection.
> Prior audits (`docs/archive/TECH_DEBT_AUDIT.md`, health report §9) treated as leads; numbers below are
> re-measured today. Distinguishes **measured** from **theoretical**. Sandbox lacks a browser;
> every runtime metric that needs one is labeled **unmeasured** and routed to the M10 session.

## 1. Repeatable baseline (how to reproduce)

```bash
npm ci            # 539 packages, 0 vulnerabilities (npm audit, re-run today: 0/0/0/0/0)
npm test          # 741/741 pass (68 suites)
npm run build     # vite 6 + PWA generateSW; numbers in §2
node --version    # v22.22.3 (sandbox) — .nvmrc pins 22.23.2; engines: ^22.23.2 || ^24.0.0
```

Build reproduction is deterministic per content; chunk hashes change only with content.

## 2. Measured production-build baseline (today's `npm run build`)

| Asset | Raw | gzip (as printed by vite) | Notes |
| --- | ---: | ---: | --- |
| Main entry `index-*.js` | 324.5 kB | 90.8 kB | app code, eagerly needed |
| `vendor-react` | 181.0 kB | 59.6 kB | react+dom+router, pinned chunk |
| `vendor-forms` | 82.8 kB | 22.9 kB | RHF+resolvers+zod |
| `vendor-lucide` | 34.9 kB | 6.8 kB | icons |
| `vendor-zxing` | 444.2 kB | 112.9 kB | **lazy — see §3 finding P1: NOT on any initial path** |
| Landing chunk `index-*.js` (small) | 1.6 kB | 0.9 kB | `/landing` entry |
| `index-*.css` | 71.1 kB | 11.1 kB | Tailwind output |
| Fonts (25 × woff2, Noto Sans Arabic 400–800) | 444 kB total | — | unicode-range split; browser fetches only needed ranges |
| **PWA precache** | **2,809.7 KiB, 140 entries** | — | one-time install cost; includes fonts+JS+CSS |
| `dist/` total | 3.1 MB | — | 79 JS chunks (all pages lazy via `routePages.ts`) |

**Initial load measured floor:** entry + vendor-react + vendor-lucide + CSS ≈ 612 kB raw /
**≈164 kB gzip** + applicable font ranges. That is a healthy budget for a mid-range shop phone
on Wi-Fi, and the critical first screen (login) does not require zxing, forms, or route pages.

## 3. Findings — measured bottlenecks vs theoretical

### P1 — Barcode scanner weight is well-placed (measured: no action)
`BarcodeScanner` is `React.lazy` *inside* each consuming page (`DressesPage.tsx:24-26`),
and `@zxing/*` is pinned to its own 444 kB chunk. Topology verified: nothing on the login,
dashboard, landing, or sync path imports it. **Cost is paid only when a staff member opens
the scanner — exactly the right trade for a counter device.** No remediation; do not
"optimize" by moving it eagerly.

### P2 — Cloud hydrate has no bounded wait (static finding, unmeasured, cheap fix available)
`fetchShowroomState()` in `CloudDataGate` relies on the SDK's un-bounded fetch. On a wedged
Wi-Fi connection the shell can sit on «جارٍ تحميل بيانات المعرض…» until browser-level TCP
timeouts. The landing repository already proves the pattern (12 s manual `AbortController`,
M3) — the same shape applied to hydrate/commit is the smallest remediation.
- Impact: rare-path availability on poor networks; trust copy already exists.
- Effort: small (mirror an existing pattern); regression risk: low; test: fake-timer/abort
  unit test as done in `landing-inventory` suite.
- Verdict: **valid, worth doing next maintenance window; NOT a launch blocker** (retry +
  error state exist; the risk is duration, not correctness).

### P3 — Precache payload 2.8 MB incl. 444 kB of fonts (measured; acceptable)
First install downloads all precache entries. Five Arabic font weights are the avoidable
slice; 400/600/700 carry the UI, 500/800 are marginal. Subsetting or dropping two weights
would cut ~150–200 kB of install-time data. **Verdict: defer — correctness-neutral vanity
gain; revisit only if device session shows slow first install.**

### P4 — Runtime rendering/rerender/long-task/memory behavior (UNMEASURED — needs browser)
No browser runs here (Playwright CDN blocked), so hydration time, rerender counts, long
tasks, and listener/interval hygiene claims are **not asserted**. Everything inspected by
code reads clean (countdown effects clean up; storage subscription unsubscribes), but code
reading is not profiling. → **M10 must include: Chrome performance profile of login→
dashboard→reservation→payment, plus 5-minute idle memory sample.** No optimization work may
be scheduled from theory alone.

### P5 — Server/API profile (partially measured, partially external)
- Measured-good patterns: single-query landing fetch; single-query errors summary
  (`count:'exact'` + limit 1); storage list call for server copies; batched mutation queue
  (one RPC per audited command); bounded log tables via 0017; **16 `CREATE INDEX`
  statements across migrations** aligned to real query patterns.
- Unverifiable here: live latency, index hit-rates, connection counts (sandbox cannot reach
  Supabase). → M10 live measurements; retention job already queued (M4) for the two
  append-only tables — **the only table-growth risk in the system.**
- N+1: none found in code inspection; per-item work happens over local collections with
  in-memory indexes, which is the architecture's deliberate single-showroom simplification.

## 4. Dependency & support risks (evidence-based)

| Package | Evidence | Risk | Recommendation |
| --- | --- | --- | --- |
| `@zxing/library@0.22.0` | declares Node ≥24; project runs 22 | Works today (bundled, not run under Node); future scanner update may drop 22 | **Postpone updates; re-verify scanner on device before any bump** (health R7) |
| `date-fns` | **zero imports** across `src/`, `tests/`, `supabase/` (grep-verified) | Dead weight in manifest only; **zero bundle bytes** (tree-shaking verified) | Remove in next maintenance window with a lockfile-only diff; low risk |
| `glob` (transitive) | npm ci deprecation warning | build-tooling only | Postpone; rides with vite/toolchain updates |
| `@tauri-apps/api` / CLI | 1 usage (desktop boundary), Windows CI retired | Kept deliberately for historical recovery (ADR trail) | Keep; no action |
| All others | 0 vulnerabilities today; React 19, Vite 6, Tailwind current | — | **No package needs an update today.** Do not batch-upgrade for freshness. |

## 5. Debt register — ranked by Risk Reduction ÷ Effort (user value in parens)

| # | Debt | Evidence | Risk↓/Effort | Decision |
| --- | --- | --- | --- | --- |
| D1 | Cloud hydrate/commit unbounded wait | P2 | High (trust) / S | **Next window** |
| D2 | Whole-file `eslint-disable` (no-explicit-any, no-unused-vars) in `reservationCommands.ts` | grep: 1 of 2 disables in repo | Medium / S-M | Schedule; the file is the most load-bearing command surface — type it gradually, suite `workflows`+`reservation-*` cover behavior |
| D3 | `reservation.service.ts` 1,114 lines | wc | Medium (maintainability) / M | Keep as façade; split by query/command modules when next touched (per health R8; no speculative refactor now) |
| D4 | `date-fns` unused manifest entry | grep-verified 0 imports | Low / S | Remove next window (lockfile-only) |
| D5 | Font weight excess (500/800) | precache audit | Low / S | Defer to M10 measurement |
| D6 | No test-coverage metric | health §9 | Medium / S | Node-22 native `--experimental-test-coverage`; record baseline, don't gate (Plan M8) |
| D7 | Docs drift (historical audits mixed with current) | root `docs/` listing | Low / S | Archive batch M9 (already queued) |

## 6. Safe quick wins (listed only — this pass implements nothing)

1. Mirror landing's `AbortController` timeout shape into cloud hydrate/commit (D1).
2. Delete `date-fns` from `package.json` (D4) — bundle guaranteed unchanged.
3. Coverage baseline via native node flag, table in `docs/` (D6).
4. Two-weight font trim **only after** M10 shows install-time pain (P3).

## 7. Explicitly unjustified complexity (do NOT propose these)

- No microservices / no server-rendered rewrite / no Next.js migration — Zero proven
  limitation; current single-showroom snapshot architecture is the product's strength.
- No state-library addition (Redux/Zustand) — hooks + services are holding.
- No "upgrade everything to latest majors" — zero-vulnerability, current majors; churn risk
  without user value.
- No service-worker runtime caching for API data — deliberate privacy boundary.
- No dependency-injection container, no event bus beyond the existing typed window channels.

## 8. Phased roadmap (no rewrite)

- **Phase P-A (next maintenance window, all safe):** D1 bounded cloud wait, D4 dep removal,
  D6 coverage baseline. Gate: full suite green (741 today).
- **Phase P-B (with M10 device session):** P4 runtime profiling; font trim decision (P3);
  live Supabase latency/index/connection capture (P5-external); retention evidence (M4).
- **Phase P-C (only when touching reserving again):** D2 typing sprint on
  `reservationCommands.ts`; D3 service split behind unchanged suite contracts.

**Rollback for every item:** each is a single-purpose diff behind the full gate; nothing
here touches schema, money semantics, or migrations.
