# Technical Decisions — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress`.
> Format: context → alternatives compared (correctness, security, maintainability,
> compatibility, operational burden, cost, reversibility, agent-maintainability) → decision
> → consequences. No architecture is rewritten by preference; every change is the smallest
> robust repair compatible with the existing system.

## D1 — Server point-in-time backup copies (implemented, verified)

- **Context:** the server held only the latest `showroom_state` snapshot; the provisioned
  private `backups` bucket (migration 0011, active-user RLS, 100 MiB/file) was completely
  unwired. One wrong import or lost device equaled permanent loss of history.
- **Alternatives:** (a) scheduled server-side backups via pg_cron/Edge Function — strongest
  guarantee but requires live-DB owner action and new infra surface; (b) do nothing +
  document a manual drill — leaves the #1 risk standing; (c) **copy-on-export from the app
  into the existing bucket** — zero new infra, zero schema change, uses an export that
  already happens daily.
- **Decision:** (c) now; (a) later as an owner/infra decision (already queued in the strategy).
  Copy is best-effort, never blocks export/close, deterministic time-ordered names,
  retention = newest 20, restore reuses the validated import behind an explicit admin
  confirm; failures report to `client_error_events` (`backup-cloud-copy`).
- **Consequences:** storage growth bounded (~20 × few MB); any active staff account can
  create/delete copies (same trust level as their existing snapshot read/write) — accepted;
  restore is admin-only via the route guard + server RLS.
- **Reversibility:** delete the wiring call; server copies are inert files.
- **Evidence:** `tests/cloud-backup-copies.test.mjs` (12), gate 719/719.

## D2 — Client-side snapshot size gauge + pre-commit guard (implemented, verified)

- **Context:** every command commits the full snapshot; the server hard-rejects
  > 20 MiB (`octet_length` in migration 0016). There was no measurement anywhere, and the
  RPC rejection surfaced as a generic «تعذر حفظ العملية» — a write outage with no warning.
- **Alternatives:** (a) offload condition photos to Storage first — real fix for growth,
  but a data-migration decision with its own risk, sequenced later; (b) server-only error
  mapping — no early warning; (c) **measure locally + thresholds + guard** — smallest
  change that converts a silent outage into a managed, observable curve.
- **Decision:** (c). `measureSnapshotBytes` (UTF-8 bytes, approximates `jsonb::text`
  octet_length with documented margin), readings persisted via the platform storage port on
  hydration + accepted commits, warning 50% / critical 80% (10/16 MiB), admin card in
  `/preferences`, pre-commit throw with the exact same error code and an operator-safe
  Arabic message, server rejection mapped to the same message, critical-band telemetry once
  per day (`snapshot-size-critical`).
- **Consequences:** one extra `JSON.stringify` per command (≈ milliseconds at realistic
  sizes ≤ few MB; worst case bounded by the cap); storage-port writes are failure-swallowed
  by design, so the gauge can never break an operational command.
- **Reversibility:** remove the wrapper lines; no data shape changed.
- **Evidence:** `tests/snapshot-size-guard.test.mjs` (7), incl. a test pinning the client
  20 MiB constant to the migration value.

## D3 — Public catalogue fetch timeout (implemented, verified)

- **Context:** `/landing` is the public face on Omani mobile networks; the fetch had no
  timeout, so a stalled TLS/TCP could hang the inventory's loading state indefinitely.
- **Alternatives:** `AbortSignal.timeout()` — cleaner API but missing on older WebKit;
  manual `AbortController + setTimeout` — maximum compatibility, trivial.
- **Decision:** manual controller, 12 s budget (`LANDING_FETCH_TIMEOUT_MS` exported and
  pinned by test), fail-closed into the existing Arabic error state; `clearTimeout` in
  `finally` (also keeps Node test runs clean).
- **Reversibility:** one constant + one signal option; behavior on success is unchanged.
- **Evidence:** two new behavioral tests in `tests/landing-inventory.test.mjs` (14/14 suite).

## D4 — Retire the dead Windows/Tauri CI workflow (implemented, verified)

- **Context:** `windows-release.yml` pushed from stale branch `feature/supabase-auth`;
  ADR 0001 excludes Tauri from the release surface. A green badge on a dead line is
  misleading signal.
- **Alternatives:** keep-but-ignore (signal rot), fix the Tauri line (out of release scope;
  Rust/toolchain work for a surface the product does not ship), **retire the workflow, keep
  `src-tauri/` code for historical recovery** (documented retention reason).
- **Decision:** retire. Consequence found by the gate: `runtime-env` test used the file as a
  third Node-22 witness — updated to assert the two live workflows with the rationale inline
  (the safety net worked as designed; no test was weakened — the invariant still holds on
  all remaining CI).
- **Reversibility:** `git` history restores the file if Tauri is ever revived.
- **Evidence:** gate 719/719 after removal.

## D5 — Remove duplicate `postcss.config.cjs` (implemented, verified)

- **Context:** two identical PostCSS configs (`.cjs` + `.mjs`) — ambiguous resolution order
  is a config footgun; package is `"type": "module"` so `.mjs` is the native form.
- **Decision:** keep `.mjs`, delete `.cjs`. **Proof of zero behavior change:** production CSS
  byte-identical (`index-Blp2SYr9.css`, md5 `b2f5ba2748345c32863ff3ef903276f8`) before/after.

## D6 — Observability ordering hardening (implemented, verified)

- **Context:** `reportClientError` evaluated `isSupabaseConfigured()` before the
  window-check; on non-browser runtimes (`import.meta.env` undefined) that orders a
  TypeError into an unhandled rejection the moment any caller runs off-browser.
- **Decision:** window-check first (one-line reorder; browser behavior unchanged).
- **Evidence:** exercised by the snapshot-guard telemetry path tests; full gate green.

## D7 — Cloud backup slice wiring (superseded by none; recorded for completeness)

- Order: audit command commits first, server copy strictly after, outside the rollback
  boundary — a storage hiccup can never roll back a correct local export or a daily close.
- File names are derived from the backup's own `exportedAt` (idempotent re-exports).

## D8 — Device-PIN abuse throttle (implemented, verified)

- **Context:** the device lock verifier is strong cryptography (PBKDF2-SHA256, 210k
  iterations, constant-time compare, verifier-only storage) but had zero attempt
  limiting — an unbounded guessing oracle on a borrowed phone.
- **Alternatives compared:** (a) server-side throttle — rejected: the gate is
  offline-first by design and the PIN never leaves the device; (b) lock only, reset
  everything on success — rejected: lets a borrower farm short 30s locks indefinitely;
  (c) escalating lock with persistent level, counter resets on success — chosen.
- **Decision:** device-local throttle record (`lena:device-security:pin-throttle:v1`),
  5 consecutive failures → exponential lock 30/60/120/240/cap-480s; locked attempts
  refuse *before* derivation (no free oracle); success clears the counter but keeps the
  escalation level (owner worst case is bounded by the 8-minute cap); `configureDevicePin`
  resets everything; the record never enters backups/imports and survives reset —
  same semantics as the PIN verifier itself. `changeDevicePin`/`removeDevicePin`
  refuse while locked. UI: amber live-countdown `role="alert"`, disabled submit,
  attempts-remaining warning only when ≤ 2 remain (no early information leak).
- **Consequences:** quick-guess attacks die at ≤5 tries-plus-wait; worst legitimate
  self-lockout 8 minutes; no network, no new dependency, no schema change.
- **Evidence:** `tests/device-pin.test.mjs` 9/9 (incl. escalation math, no-backup-leak,
  reset-survival, gate wiring); full gate 737 green; review-pass fix recorded in Plan M11.

## D9 — Admin "system errors" count card (implemented, verified)

- **Context:** `client_error_events` (0016: insert=any active user, select=admin only)
  collected silently; support could not see accumulating failures without the console.
- **Alternatives compared:** (a) external alerting service — rejected: cost + a new
  vendor + credentials to manage, over-sized for one showroom; (b) full row browser in
  the app — rejected: turns the counter UI into a second log viewer to maintain, and
  pulls error payloads onto the shop screen; (c) read-only count + latest-timestamp
  card on the admin preferences surface — chosen.
- **Decision:** single round trip (`count:'exact'`, order desc, `limit 1`); every
  failure path (no window, not configured, no session, network error) degrades to a
  calm "unavailable" state; manual refresh; copy directs the owner to report with the
  app version. Row-level browsing stays in the Supabase console for support.
- **Consequences:** zero cost, zero new dependencies, RLS is the only guard (verified
  by test against migration 0016); visibility now exists where the owner already looks.
- **Evidence:** `tests/system-errors-summary.test.mjs` 3/3 (query shape, admin-only
  mounting, RLS contract); full gate 737 green.

## Deliberately NOT done (with reasons)

- **No merge-based multi-device sync / no CRDT** — revision-conflict + rehydrate is correct
  and safe for one showroom; merge semantics would complicate every financial invariant.
  Revisit only with real multi-device pressure evidence.
- **No pg_cron/Edge Function in the repo** — applying anything to the live database is an
  owner/production action; recommended SQL is staged in the Remediation Plan instead.
- **No SSR/Next.js, no state-library rewrite, no form-library migration** — no proven
  limitation; incremental local improvements win on every policy axis.
- **No service-worker runtime caching of API data** — privacy boundary deliberately kept.
- **No coverage tooling purchase/setup this round** — recorded in Plan M8 as an internal
  quality step, not blocking.
