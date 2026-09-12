import test from 'node:test';
import assert from 'node:assert/strict';
import { readSource } from './helpers/readSource.mjs';

const CHECKLIST = 'docs/EXECUTION_CHECKLIST.md';

/**
 * Execution-checklist integrity guard.
 *
 * On 2026-09-12 a documentation update was sent through the GitHub contents
 * API, which replaces a file wholesale. The caller sent only the new section,
 * and 685 lines of delivery history were silently deleted (commit `25b2375`,
 * restored in `c69849c`). Nothing in the repository noticed, because the
 * checklist is prose: no test read it.
 *
 * These assertions make that class of mistake fail the default gate instead of
 * the next reader. They are floors, not exact counts, so adding content never
 * breaks them — only losing content does. If a section is legitimately
 * retired, update the pinned list in the same commit and say why.
 */

/** Every `##` section the checklist must keep. Order is not asserted. */
const REQUIRED_SECTIONS = [
  '## Completion marks',
  '## Agent takeover protocol',
  '## Current execution queue',
  '## Phase 1 queue — Data identity, safety, and unified persistence',
  '## Phase 2 queue — Atomic workflows and financial correctness',
  '## Phase 3 queue — Selective capability recovery',
  '## Phase 6 queue — Operational calendar and accessories',
  '## Phase 7 queue — Inventory performance and profitability reports',
  '## Phase 8 queue — UX hardening from real-device feedback',
  '## Phase 9 queue — Designs, variants and interface depth',
  '## Phase 10 queue — Design management, design reporting and customer follow-up',
  '## Phase 11 queue — Conduct, attribution, liability and waiting list',
  '## Phase 12 queue — Measurements, contacts and document printing',
  '## Phase 13 — Operational gaps found by reading the code',
  '## Phase 4 queue — Runtime QA',
  '## Phase 5 queue — Release and handover',
  '## Deferred Phase 0 cleanup',
  '## Evidence log',
  '## Owner-directed product strategy session (2026-08-20)',
  '## DB closure session (2026-08-20, second)',
  '## Delivery-authorship gate (2026-09-12)',
  '## Security authority remediation (2026-08-22, owner-directed stop-line)',
  '## Handoff-closure session (2026-08-20, third)',
  '## Independent audit verification session (2026-09-12, fourth)',
];

/** The 2026-09-12 accident reduced the file to 14 lines / 2.6 kB. */
const MIN_LINES = 600;
const MIN_BYTES = 40_000;
const MIN_CHECKED = 100;
const MIN_OPEN = 8;

const read = () => readSource(CHECKLIST);

test('the execution checklist survived the edit (size floor)', async () => {
  const content = await read();
  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf8');

  assert.ok(lines >= MIN_LINES, `checklist is ${lines} lines; a full-file overwrite is suspected (floor ${MIN_LINES})`);
  assert.ok(bytes >= MIN_BYTES, `checklist is ${bytes} bytes; a full-file overwrite is suspected (floor ${MIN_BYTES})`);
});

test('every tracked phase and session section is still present', async () => {
  const content = await read();
  const missing = REQUIRED_SECTIONS.filter((section) => !content.includes(`${section}\n`));

  assert.deepEqual(missing, [], 'sections lost from the checklist — restore them or update this list deliberately');

  const headings = (content.match(/^## /gm) ?? []).length;
  assert.ok(headings >= REQUIRED_SECTIONS.length, `only ${headings} sections remain`);
});

test('the queue state markers and the evidence table are intact', async () => {
  const content = await read();

  for (const marker of ['**NEXT', '**PENDING', '**BLOCKED', '| Item | PR / commit |']) {
    assert.ok(content.includes(marker), `the checklist lost its "${marker}" marker`);
  }

  const evidenceRows = content
    .split('\n')
    .filter((line) => line.startsWith('| Phase ') || line.startsWith('| Source-of-truth'))
    .length;
  assert.ok(evidenceRows >= 20, `the evidence log has only ${evidenceRows} rows`);

  const checked = (content.match(/^- \[x\] /gm) ?? []).length;
  const open = (content.match(/^- \[ \] /gm) ?? []).length;
  assert.ok(checked >= MIN_CHECKED, `only ${checked} completed items remain (floor ${MIN_CHECKED})`);
  assert.ok(open >= MIN_OPEN, `only ${open} open items remain — an honest queue always has some (floor ${MIN_OPEN})`);
});

test('the checklist keeps pointing at the next assignment', async () => {
  const content = await read();

  // The one rule that makes this file useful to the next agent: there is always
  // exactly one visible next task, and it is in the queue, not in a session note.
  assert.match(content, /The first unchecked, unblocked item in \*\*Current execution queue\*\* is the next agent's assignment\./);
  assert.ok(
    content.indexOf('## Current execution queue') < content.indexOf('## Evidence log'),
    'the queue must stay above the historical evidence log',
  );
});
