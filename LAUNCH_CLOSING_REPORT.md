# Launch Closing Report — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress` · Owner-directed closing pass after
> roadmap NOW items. Gate on final state: **754/754 tests, typecheck PASS, lint PASS,
> build PASS**, preview serving the fresh bundle (hash-matched), 131/131 precached
> runtime assets resolve over HTTP, PWA icons/routes 200.
> ملخص عربي في الأسفل.

## English register

### 1. Problems actually found during this pass's walkthrough

| # | Finding | How found | Severity |
| --- | --- | --- | --- |
| W-1 | Chip-insert would PREPEND a token into a settled message on fresh focus (caret reports 0) | DOM walkthrough (`walkthrough-dom` #5) caught it failing | Medium-High: a broken WhatsApp message ships under the showroom's name |
| W-2 | `navigator` global is getter-only in Node 22; react-dom must load AFTER jsdom globals exist (its `canUseDOM` decision is frozen at module evaluation) | harness bring-up; fixed in `tests/helpers/jsdom-react.mjs` (dynamic import after globals) | Test-infra correctness |
| W-3 | Stale source-contract regex in `product-ux-copy` after the W-1 fix (chain halted at that suite) | full gate run | Test maintenance |
| W-4 | No admin gating assumption risk: nav hides `/preferences` for non-admins by data+filter (verified 20 items / exactly one adminOnly) — i.e., nothing found, verified absent | data-level walkthrough | — (clean) |

### 2. What was fixed (all shipped + verified in the full gate)

- **W-1 → fixed in component:** fresh focus now rests the caret at the message end
  (`onFocus` normalization in `MessageTemplatesEditor`); contract pinned in
  `product-ux-copy` and behavior proven in `walkthrough-dom` (inserts at explicit caret,
  inserts at end on plain focus, never touches the unfocused message).
- **W-2 → fixed in harness** (documented why; reusable by future DOM suites).
- **W-3 → contract updated** to pin the new behavior, not the old shape.
- **NOW items delivered:** UX-M1 («جاهزية المعرض» checklist: store-derived 0/3→3/3,
  deep links, device-local dismissal persistent across reload, self-retiring) and
  UX-M3 («عن التطبيق والدعم» staff-visible card with real build identity, no invented
  contacts). Evidence: `tests/dashboard-setup.test.mjs` (3), `tests/walkthrough-dom.test.mjs` (6).
- **Verification layers completed this pass:** jsdom DOM walkthroughs of NotFound,
  navigation shape/roles, dashboard empty/partial/complete, template insert, errors-card
  calm degradation; HTTP sweep of every precached asset (131/131) + PWA icons + core
  routes; static layout audit (viewport-fit=cover, 2 safe-area kinds, mobile-first
  breakpoints 640/768/1024/1280/1536 present); SW confirmed zero API runtime caching.

### 3. What genuinely remains before launch (nothing left *in code*)

| # | Item | Owner of the action | Why open |
| --- | --- | --- | --- |
| L-1 | Real-device session (M10): camera scanning + manual fallback, contract/invoice/label printing, PWA install + offline + update prompt, 390×844 & 360×740 captures, one full live journey, M1 restore drill, M11 lockout UX, login-throttling evidence, runtime performance profile (audit §P4) | Owner devices + agent driving | No browser/camera/printer in sandbox; TLS to Supabase blocked |
| L-2 | Owner console actions: MFA enable (M6), account lifecycle runbook walk | Owner console (~15 min) | Credentials/production-bounded |
| L-3 | Approved retention policy — **owner-decided DEFERRED (2026-08-20)**: no deletion of any records until an operational reason + written policy exist; backups are not a deletion justification | Owner policy document | Explicit owner decision this pass |
| L-4 | Landing mobile content shortening (UX-M4), preferences sub-navigation (UX-M2) | Agent, after M10 | Structural; verify once on device, not twice |
| L-5 | Bounded cloud-hydrate wait (audit D1), `date-fns` removal (D4), coverage baseline (D6) | Agent, next maintenance window | Safe leftovers, non-blocking |

### 4. Items still based on assumption, not verification (honest register)

| # | Assumption | Why it's still an assumption | Falsifier / closure action |
| --- | --- | --- | --- |
| A-1 | Pixel-level layout at 390/360 widths is defect-free (overflow, tap targets) | Prior rendered audit 17-08 was pre-latest-changes; no browser this pass; DOM/static/HTTP layers all green | M10 captures per route |
| A-2 | Camera barcode scanning works on the owner's phones | No camera in sandbox; scanner lazy-chunk verified structurally only | M10 camera test |
| A-3 | Printing (contracts/invoices/labels) matches physical output | No printer in sandbox; suites pin templates/markup only | M10 print test |
| A-4 | Live Supabase journeys (hydrate/commit/restore/auth throttle) behave as the mocked contracts | TLS blocked from sandbox; all sync behavior proven against mocks + migration contracts | M10 live drill |
| A-5 | «العميلات» + female-imperative voice fits the owner's brand voice | Dominant existing pattern; never confirmed by the owner | One owner read of the glossary (LOCALIZATION_CONTENT_SYSTEM §3) — yes/no |
| A-6 | Single-device counter rhythm (no simultaneous two-till conflict) | Sync is last-writer revision-guarded; never exercised with two live devices | M10 optional second-device probe |
| A-7 | Node sandbox being v22.22.3 vs .nvmrc 22.23.2 masks nothing | npm tolerated it; CI runs 22.23.2 | CI green on push |
| A-8 | Font/precache install weight (~2.8 MB) is acceptable on the shop Wi-Fi | No network-throttled real install measured | M10 first-install observation |

---

## ملخص عربي للمالكة

- **اكتشفتُ وأصلحتُ عيبًا حقيقيًا أثناء الفحص التشغيلي:** زر إدراج الرمز في نصوص واتساب كان
  سيضع الرمز في *بداية* الرسالة عند أول لمسة — الآن يُدرج في نهايتها (أو مكان المؤشر بالضبط)، مُثبت باختبار تفاعلي.
- **أُنجزت بنود NOW:** بطاقة «جاهزية المعرض» (٣ خطوات بروابط مباشرة، تخفي نفسها عند الاكتمال،
  و«إخفاء» يبقى محفوظًا) وبطاقة «عن التطبيق والدعم» الظاهرة للموظفات برقم الإصدار الحقيقي.
- **التحقق:** 754/754 اختبارًا، كل الأصول عبر HTTP سليمة (131/131)، الفحص الساكن للتخطيط سليم،
  وست جولات DOM تشغيلية خضراء. **ما لم يُتحقق بصريًا بكسليًا يبقى محجوبًا خارجيًا (لا متصفح هنا)**
  ومسجّلًا في سجل الافتراضات أعلاه — لا ادعاءات زائفة.
- **قبل الإطلاق فعليًا:** جلسة الأجهزة (L-1) هي البند الجوهري الوحيد المتبقّي داخل نطاق التطبيق،
  ثم قرارات وحدة التحكم (L-2) متى جاهزتِ.
