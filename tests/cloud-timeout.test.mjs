import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import {
  CLOUD_CALL_TIMEOUT_MS,
  CLOUD_COMMIT_TIMEOUT_MESSAGE,
  CLOUD_HYDRATE_TIMEOUT_MESSAGE,
  createCloudCallTimeout,
  isAbortLike,
} from '../src/features/sync/showroomCloudState.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path) => readFile(join(repositoryRoot, path), 'utf8');

// Kept well under CLOUD_CALL_TIMEOUT_MS so the suite stays fast; the mechanism
// is identical at any budget.
const delay = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

test('the cloud-call timeout aborts on schedule and can be disarmed', async () => {
  const firing = createCloudCallTimeout(20);
  assert.equal(firing.signal.aborted, false, 'never fires early');
  let abortFired = false;
  firing.signal.addEventListener('abort', () => { abortFired = true; });
  await delay(45);
  assert.equal(firing.signal.aborted, true, 'fires after the budget');
  assert.equal(abortFired, true, 'listeners are notified');

  const disarmed = createCloudCallTimeout(20);
  disarmed.done();
  await delay(45);
  assert.equal(disarmed.signal.aborted, false, 'done() before the budget prevents the abort');
});

test('abort classification drives the timeout contract (honest, idempotency-aware wording)', () => {
  const { DOMException } = globalThis;
  assert.equal(isAbortLike(new DOMException('The operation was aborted.', 'AbortError')), true);
  assert.equal(isAbortLike(new Error('The user aborted a request.')), true);
  assert.equal(isAbortLike(new Error('fetch failed')), false);
  assert.equal(isAbortLike(null), false);

  assert.match(CLOUD_HYDRATE_TIMEOUT_MESSAGE, /أعيدي المحاولة/);
  assert.match(CLOUD_COMMIT_TIMEOUT_MESSAGE, /لن يتكرر تسجيل العملية نفسها/, 'commit retry safety is stated because the RPC is idempotent');
  assert.ok(CLOUD_CALL_TIMEOUT_MS >= 10_000 && CLOUD_CALL_TIMEOUT_MS <= 30_000, 'budget stays humane on shop Wi-Fi');
});

test('both cloud entry points carry the bounded signal and map LENA_CLOUD_TIMEOUT', async () => {
  const cloud = await readSource('src/features/sync/showroomCloudState.ts');

  const hydrateBody = cloud.slice(cloud.indexOf('export async function fetchShowroomState'), cloud.indexOf('export async function commitShowroomState'));
  const commitBody = cloud.slice(cloud.indexOf('export async function commitShowroomState'));

  for (const [name, body] of [['hydrate', hydrateBody], ['commit', commitBody]]) {
    assert.match(body, /createCloudCallTimeout\(\)/, `${name} arms the timeout`);
    assert.match(body, /\.abortSignal\(timeout\.signal\)/, `${name} passes the signal into the postgrest builder`);
    assert.match(body, /timeout\.done\(\)/, `${name} always disarms (finally)`);
    assert.match(body, /'LENA_CLOUD_TIMEOUT'/, `${name} maps aborts to the actionable code`);
  }
  assert.match(hydrateBody, /CLOUD_HYDRATE_TIMEOUT_MESSAGE/);
  assert.match(commitBody, /CLOUD_COMMIT_TIMEOUT_MESSAGE/);
  assert.doesNotMatch(cloud, /AbortSignal\.timeout/, 'manual controller only — older staff WebKit support is a hard constraint');

  const gate = await readSource('src/features/sync/CloudDataGate.tsx');
  assert.match(gate, /إعادة المحاولة/, 'the surfaced error keeps its retry affordance');
});
