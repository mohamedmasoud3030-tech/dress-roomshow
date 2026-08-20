# Test Coverage Baseline — LENA (M8 residue, RM-5)

> 2026-08-20 · Recorded, **not gating** (per TECHNICAL_REMEDIATION_PLAN M8).
> Tool: Node 22 native `node --experimental-test-coverage` — zero new dependencies.

## Convention (and why)

Coverage runs **per suite, in its own process**:

```bash
node --experimental-test-coverage --import tsx --test tests/<suite>.test.mjs
```

A single-process whole-repo run is deliberately NOT the convention: suites own their global
lifecycle (storage doubles, jsdom window, fake timers) per process — the same isolation the
`npm test` chain enforces by spawning one process per suite. Forcing one process would measure
a broken harness, not the product.

## First baseline row (measured 2026-08-20)

| Suite | What it loads | Line % | Branch % | Func % |
| --- | --- | ---: | ---: | ---: |
| `workflow-commands` | workflow command layer + touched domain services | **60.22** | 60.16 | 52.20 |

Reading: the percentage covers only the modules that suite's process loaded — which is exactly
the honest unit of measurement for "does this journey touch its code". Aggregate "repo %"
numbers from single-process runs would silently miss isolated suites, so none is quoted.

## Rules

- Add a row when a new load-bearing suite lands; never gate CI on the number yet.
- Suites asserting **source text** (contracts) still prove wiring without executing the module —
  they count as protection, not coverage; see health report §9 for the accepted tradeoff.
