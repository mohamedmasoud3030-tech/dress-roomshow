# LENA Repository Agent Skills

This repository intentionally keeps a small, product-specific skill set. These skills exist to protect LENA's actual delivery risks; they are not a general-purpose prompt library.

Every agent must:

1. read `AGENTS.md`;
2. read this index;
3. open every matching `SKILL.md` before changing code or documentation;
4. fall back to `AGENTS.md`, `docs/BUSINESS_MODEL.md`, and `docs/FINAL_DELIVERY_PLAN.md` when no skill matches instead of inventing a new skill.

## Available skills

| Skill | Use when | Path |
| --- | --- | --- |
| `showroom-domain-workflows` | Inventory, customers, reservations, delivery, return, inspection, service, sales, or cross-workflow state transitions are affected. | `.agents/skills/showroom-domain-workflows/SKILL.md` |
| `local-data-safety` | Persistence, localStorage, IndexedDB images, migrations, backup/restore, reset, Tauri snapshots, IDs, or atomic multi-collection writes are affected. | `.agents/skills/local-data-safety/SKILL.md` |
| `financial-correctness` | Payments, deposits, refunds, fees, sales, expenses, daily closing, balances, or financial reports are affected. | `.agents/skills/financial-correctness/SKILL.md` |
| `frontend-mobile-rtl` | A user-facing route, component, form, navigation flow, print view, camera/barcode flow, or responsive behavior is changed. | `.agents/skills/frontend-mobile-rtl/SKILL.md` |
| `release-readiness` | Any feature, fix, refactor, phase, desktop build, or release candidate is about to be called complete. | `.agents/skills/release-readiness/SKILL.md` |

## Selection rules

- Apply all relevant skills when a task crosses domains. A return-settlement change normally needs domain, data, financial, UI, and release skills.
- Do not copy generic skills into this repository unless a verified delivery gap cannot be covered by these five files.
- Do not create command wrappers or duplicate checklists that compete with `AGENTS.md` or the final delivery plan.
- Keep new guidance in the existing skill that owns the concern. Add a new skill only when the concern has distinct triggers, invariants, and verification requirements.
