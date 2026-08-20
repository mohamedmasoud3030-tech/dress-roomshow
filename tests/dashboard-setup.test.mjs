import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { installStorage, uninstallStorage, todayISO } from './helpers/storage.mjs';
import { resetCountersForTesting } from '../src/engines/persistence/index.ts';
import { addCustomer } from '../src/features/customers/customer.service.ts';
import { addDress } from '../src/features/dresses/dress.service.ts';
import { createReservationCommand } from '../src/features/workflows/reservationCommands.ts';
import { DEFAULT_APP_PREFERENCES, saveAppPreferences } from '../src/features/preferences/preferences.service.ts';
import { addDaysISO } from '../src/shared/utils/date.ts';
import { getSetupChecklist, SETUP_CHECKLIST_DISMISS_KEY } from '../src/features/dashboard/setupChecklist.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path) => readFile(join(repositoryRoot, path), 'utf8');

function cleanup() {
  resetCountersForTesting();
  uninstallStorage();
}

const dressInput = {
  name: 'فستان زفاف', description: '', itemType: 'dress', category: 'زفاف', color: 'أبيض', size: 'M',
  purchasePrice: 300, rentalPrice: 100, salePrice: 500, depositAmount: 50,
  status: 'available', isForRent: true, isForSale: true, images: [], barcode: '',
};

test('setup checklist walks 0/3 → 3/3 from real store state and completes on first reservation (UX-M1)', () => {
  installStorage();
  saveAppPreferences({ ...DEFAULT_APP_PREFERENCES, preparationDaysBeforePickup: 0, cleaningDaysAfterReturn: 0, defaultPickupTime: '10:00', defaultReturnTime: '20:00' });
  const today = todayISO();
  try {
    let checklist = getSetupChecklist();
    assert.equal(checklist.completed, 0);
    assert.equal(checklist.isComplete, false);
    assert.deepEqual(checklist.steps.map((step) => [step.key, step.done]), [
      ['inventory', false], ['customer', false], ['reservation', false],
    ]);

    const dress = addDress(dressInput);
    checklist = getSetupChecklist();
    assert.equal(checklist.completed, 1, 'one piece flips inventory to done');
    assert.equal(checklist.steps[0].done, true);
    assert.equal(checklist.steps[1].done, false, 'guidance still points at the customer step');

    const customer = addCustomer({ name: 'مريم', phone: '90000030', status: 'normal' });
    checklist = getSetupChecklist();
    assert.equal(checklist.completed, 2);

    createReservationCommand({
      customerId: customer.id, dressId: dress.id, pickupDate: today, pickupTime: '17:00',
      returnDate: addDaysISO(today, 2), returnTime: '20:00', depositAmount: 0,
      idempotencyKey: 'setup-checklist-first-reservation',
    });
    checklist = getSetupChecklist();
    assert.equal(checklist.completed, 3);
    assert.equal(checklist.isComplete, true, 'the card hides itself once setup is genuinely done');
  } finally {
    cleanup();
  }
});

test('checklist dismissal stays a device-local UI preference, never backup content', async () => {
  assert.equal(SETUP_CHECKLIST_DISMISS_KEY, 'dress-roomshow:setup-checklist-dismissed:v1');

  const card = await readSource('src/features/dashboard/SetupChecklistCard.tsx');
  assert.match(card, /getBrowserLocalStorage\(\)\?\.setItem\(SETUP_CHECKLIST_DISMISS_KEY, '1'\)/, 'dismissal persists device-locally');
  assert.match(card, /if \(checklist\.isComplete \|\| dismissed\) return null/, 'completed setups never see the card again');
  assert.match(card, /أتممتِ \{checklist\.completed\} من \{checklist\.total\} خطوات/, 'honest progress wording');
  // Each pending step is a deep link; done steps are inert (no fake navigation).
  assert.match(card, /step\.done \? \(/, 'done and pending render as different affordances');
  assert.match(card, /role=|aria-label="جاهزية المعرض"/, 'the card is a named region');
});

test('the dashboard mounts the checklist and the staff-visible about/support card (UX-M3)', async () => {
  const page = await readSource('src/features/dashboard/DashboardPage.tsx');
  const mounts = (page.match(/<SetupChecklistCard \/>/g) ?? []).length;
  assert.equal(mounts, 2, 'checklist renders on both the empty and the running dashboard');
  assert.equal((page.match(/<AboutSupportCard \/>/g) ?? []).length, 2, 'about/support renders on both states');

  const card = await readSource('src/features/dashboard/AboutSupportCard.tsx');
  assert.match(card, /getAppBuildInfo\(\)/, 'shows the real build identity');
  assert.match(card, /عن التطبيق والدعم/);
  assert.match(card, /تواصلي مع المديرة أو الدعم الفني/, 'names the in-house escalation path');
  assert.doesNotMatch(card, /wa\.me|https?:\/\/|mailto:|[\w.]+@[\w.]+/, 'invents no contact channel (PD-6)');
  // The dashboard route sits under RequireAuth but NOT RequireAdmin, so staff sees it.
  const routes = await readSource('src/app/router/AppRoutes.tsx');
  assert.match(routes, /<Route index element=\{<DashboardWithClosingAlertPage \/>/, 'dashboard is the shared landing route');
  assert.doesNotMatch(routes, /RequireAdmin><Dashboard/, 'dashboard is not admin-gated');
});
