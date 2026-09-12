# Product UX Roadmap — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress`.
> Order value: user value ÷ (risk × effort), reversibility first. Done items carry proof;
> open items carry acceptance criteria. Nothing here reopens closed PX/DEF items.

## Shipped this pass (2026-08-20) — VERIFIED

| # | Item | Evidence |
| --- | --- | --- |
| UX-1 | Glossary unification «العميلات» in the 3 leaking surfaces (dashboard quick-link, reminders title, nav group) | `tests/product-ux-copy.test.mjs` |
| UX-2 | Click-to-insert placeholder chips in message templates w/ caret-aware insert + feedback | same suite (behavioral insert test) |
| UX-3 | «نوع العنصر» boundary helper copy in add-dress form (PX-09 entry point) | same suite (source contract) |
| **UX-M1** | Three-step «جاهزية المعرض» checklist: derived live from stores, deep-linked pending steps, device-local dismissal across reloads, retires itself at 3/3 | `tests/dashboard-setup.test.mjs` + DOM walkthrough |
| **UX-M3** | Staff-visible «عن التطبيق والدعم» card with real build identity and in-house escalation path; invents no contact channel (PD-6) | same suites |
| UX-4 | Chip-insert caret normalization: fresh focus now rests the caret at the message end so a token never prepends by accident — a defect the DOM walkthrough caught | `tests/walkthrough-dom.test.mjs` |

## Shipped 2026-09-12 (owner-directed UX slice) — VERIFIED

| # | Item | Evidence |
| --- | --- | --- |
| **UX-M2** | Settings sub-navigation: nine anchored, focusable groups generated from one registry (`preferencesSections.ts`), sticky tab strip, keyboard focus lands in the opened group, destructive zone still last and alone | `tests/preferences-sections.test.mjs` (5, incl. real jsdom focus movement) |
| **UX-M4** | Phone landing reaches the first dress card inside two viewport heights: capped hero crop, categories as one swipeable rail, FAQ collapsed with two answers, tighter about section — each with its `sm:` counterpart so desktop is unchanged | `tests/landing-mobile-length.test.mjs` (6): 1487 px vs a 1688 px budget; the same model rejects the previous layout at 2390 px |
| **UX-S2** | «محفوظ على الخادم ✓» after a money command is confirmed by the server: `role="status"`, self-dismissing in 3.5 s, fixed copy with no figures, operational routes only | `tests/cloud-save-ack.test.mjs` (7, incl. jsdom show/replace/dismiss) |

Gate after the slice: `tsc -b` clean, `eslint .` clean, **809/809 tests pass** (was 787), `vite build` OK.

**Two honesty notes on UX-M4:**
1. The height budget is an arithmetic model of the pinned classes, not a device capture. The real
   390×844 / 360×740 evidence is still queue item **4.02** and remains open.
2. The original acceptance criterion "sticky CTA always visible" is **superseded**: the owner
   removed the persistent booking button after this roadmap was written (`LandingPage.tsx` records
   the decision in a comment). It was deliberately not reintroduced. Related open finding:
   `tests/landing-profile.test.mjs` still asserts that markup and passes only because the strings
   survive inside the comment — either the CTA returns (owner call) or those two assertions go.

## NOW (next 1–2 sessions — high value, low risk, no owner input)

### UX-M1 — ~~Three-step setup checklist~~ — SHIPPED 2026-08-20 (see Shipped table)
Delivered exactly to its acceptance criteria, plus DOM-walkthrough proof of the dismiss
persistence and the 0→1→3 progressions.

### UX-M3 — ~~«عن التطبيق والدعم» card~~ — SHIPPED 2026-08-20 (see Shipped table)

### Remaining NOW candidate
Nothing else currently qualifies: every other open item needs either the device session
(M10), an owner yes/no, or is structural work explicitly queued NEXT/LATER.

## NEXT (after device session — needs M10 evidence or owner yes/no)

> All three items below shipped on 2026-09-12. They are kept verbatim as the acceptance record the shipped tests were written against.

### UX-M2 — ~~Preferences sub-navigation (tabs)~~ — SHIPPED 2026-09-12 (see Shipped table)
- **What:** split the growing control plane into anchored sections: «النسخ والبيانات»،
  «الحسابات والأمان»، «الرسائل»، «الطباعة»، «الصفحة العامة»، «مراقبة النظام» (gauge + errors
  + server copies). In-page anchor tabs; routes optional.
- **Why:** the page grew 4 cards this session alone; admin error-risk rises with scroll density.
- **Acceptance:** each group reachable by anchor link; destructive zone still isolated last;
  keyboard focus moves to the anchored heading; existing tests updated (selectors preserved).
- **Why not now:** pure restructure — bundle it with the M10 visual pass to verify once, not twice.

### UX-M4 — ~~Mobile landing length reduction~~ — SHIPPED 2026-09-12 (see Shipped table; the sticky-CTA criterion is superseded)
- **What:** collapse FAQ to `<details>` on <640px; cap service cards; keep sticky CTA.
- **Acceptance:** on 390×844 the first piece card renders within 2 viewport heights; sticky CTA
  always visible; desktop unchanged; `mobile-polish` pins the behavior.

### UX-S2 — ~~«محفوظ على الخادم ✓» acknowledgment~~ — SHIPPED 2026-09-12 (see Shipped table)
- **What:** reuse the persistence-status channel to flash a quiet success toast after audited
  money-touching commands when sync confirms; silent when offline (existing amber banner owns
  offline).
- **Acceptance:** toast appears only post server-ack; never on local-only; role="status";
  auto-dismiss ≤ 4 s; no financial numbers in the toast.

## LATER (needs owner input or domain change — NOT without approval)

| # | Item | Gate |
| --- | --- | --- |
| UX-L1 | Staff activation journey in-product (invite by email) | Live Supabase + owner MFA policy (M6) |
| UX-L2 | Landing online booking/deposit collection | Owner legal/payment decision (PD-1 blocks by default) |
| UX-L3 | Undo affordance for archive (30-second reversible snackbar) | Product decision; data already safe (archive-not-delete) |
| UX-L4 | Settings: PIN re-lock policy switch | PD-5 — only with M10 friction evidence |

## Anti-roadmap (deliberately NOT in any phase)

- No public checkout/cart, no multi-branch tenancy, no customer accounts, no loyalty points,
  no marketing automation, no dark mode, no redesign of ivory/gold/navy identity, no navigation
  re-invention. Reasons: scope discipline per `FEATURE_GAP_STRATEGY.md` (Do-Not-Build list) and
  zero owner/domain evidence demanding them.
