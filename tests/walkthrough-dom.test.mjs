/**
 * Operational walkthrough of the core screens as DOM behavior, not screenshots.
 *
 * The sandbox cannot download a browser engine (Playwright CDN is network-blocked,
 * re-verified 2026-08-20), so layout/pixel verification stays BLOCKED-EXTERNAL and
 * honestly labeled. What this suite DOES prove with real rendering: the journeys
 * mount, the Arabic copy is present, interactive affordances work (focus, click,
 * caret-aware insert, dismiss persistence, calm degradation), and state transitions
 * match the documented product decisions. Runs under jsdom + React act via the
 * shared harness in tests/helpers/jsdom-react.mjs — which MUST be imported first.
 */
import { act, dom, renderElement, resetDomEnvironment } from './helpers/jsdom-react.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { resetCountersForTesting } from '../src/engines/persistence/index.ts';
import { addCustomer } from '../src/features/customers/customer.service.ts';
import { addDress } from '../src/features/dresses/dress.service.ts';
import { createReservationCommand } from '../src/features/workflows/reservationCommands.ts';
import { DEFAULT_APP_PREFERENCES, saveAppPreferences } from '../src/features/preferences/preferences.service.ts';
import { addDaysISO } from '../src/shared/utils/date.ts';

import { NotFoundPage } from '../src/components/shared/NotFoundPage.tsx';
import { DashboardPage } from '../src/features/dashboard/DashboardPage.tsx';
import { MessageTemplatesEditor } from '../src/features/preferences/MessageTemplatesEditor.tsx';
import { SystemErrorsSummary } from '../src/features/observability/SystemErrorsSummary.tsx';
import { navigationGroups, mobileQuickNavigation } from '../src/app/shell/navigation.ts';

function todayISO() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

function beforeEach() {
  resetDomEnvironment();
  resetCountersForTesting();
}

function seedPreferences() {
  saveAppPreferences({
    ...DEFAULT_APP_PREFERENCES,
    preparationDaysBeforePickup: 0,
    cleaningDaysAfterReturn: 0,
    defaultPickupTime: '10:00',
    defaultReturnTime: '20:00',
  });
}

const dressInput = {
  name: 'فستان زفاف', description: '', itemType: 'dress', category: 'زفاف', color: 'أبيض', size: 'M',
  purchasePrice: 300, rentalPrice: 100, salePrice: 500, depositAmount: 50,
  status: 'available', isForRent: true, isForSale: true, images: [], barcode: '',
};

test('walkthrough — not-found route guides back with touch-sized actions', async () => {
  beforeEach();
  const view = await renderElement(createElement(MemoryRouter, null, createElement(NotFoundPage)));
  try {
    const text = view.container.textContent;
    assert.match(text, /الصفحة غير موجودة/);
    const links = [...view.container.querySelectorAll('a')];
    assert.ok(links.some((a) => a.getAttribute('href') === '/'), 'home link exists');
    assert.ok(links.some((a) => a.getAttribute('href') === '/inventory'), 'inventory link exists');
    assert.ok(links.every((a) => a.className.includes('min-h-11')), 'both actions are touch-sized');
  } finally {
    await view.unmount();
  }
});

test('walkthrough — navigation data matches the day rhythm and role boundaries', () => {
  beforeEach();
  assert.equal(navigationGroups.length, 5, 'five day-shaped groups');
  const allItems = navigationGroups.flatMap((group) => group.items);
  assert.equal(allItems.length, 20, 'twenty destinations');
  const adminItems = allItems.filter((item) => item.adminOnly);
  assert.deepEqual(adminItems.map((item) => item.to), ['/preferences'], 'exactly one admin-gated destination');
  assert.deepEqual(
    mobileQuickNavigation.map((item) => item.to),
    ['/', '/reservations', '/delivery-return', '/payments'],
    'the four counter actions stay pinned to the phone bar',
  );
  for (const item of allItems) assert.ok(item.label.length > 0 && !/[a-zA-Z]/.test(item.label), `Arabic-only label: ${item.to}`);
});

test('walkthrough — empty dashboard: guidance, checklist progress, support card, dismiss persistence', async () => {
  beforeEach();
  const view = await renderElement(createElement(MemoryRouter, null, createElement(DashboardPage)));
  try {
    const text = view.container.textContent;
    assert.match(text, /لم تبدأ بيانات المعرض بعد/, 'first-value empty state explains itself');
    assert.match(text, /أتممتِ 0 من 3 خطوات/, 'checklist starts at zero progress');
    assert.match(text, /عن التطبيق والدعم/, 'staff-visible support card exists (UX-M3)');

    const pendingLinks = [...view.container.querySelectorAll('article[aria-label="جاهزية المعرض"] a')];
    assert.deepEqual(
      pendingLinks.map((a) => a.getAttribute('href')),
      ['/inventory', '/customers', '/reservations?new=1'],
      'all three steps deep-link to where they complete',
    );

    const dismiss = view.container.querySelector('button[aria-label="إخفاء تلميحات البداية"]');
    assert.ok(dismiss, 'dismiss affordance exists');
    await act(async () => { dismiss.click(); });
    assert.equal(view.container.querySelector('article[aria-label="جاهزية المعرض"]'), null, 'dismissed immediately');
    assert.equal(dom.window.localStorage.getItem('dress-roomshow:setup-checklist-dismissed:v1'), '1', 'dismissal persisted');
    await view.unmount();

    // Remount on "reload": the dismissal survives, the empty-state guidance remains.
    const secondView = await renderElement(createElement(MemoryRouter, null, createElement(DashboardPage)));
    try {
      assert.equal(secondView.container.querySelector('article[aria-label="جاهزية المعرض"]'), null, 'stayed dismissed across reload');
      assert.match(secondView.container.textContent, /لم تبدأ بيانات المعرض بعد/);
    } finally {
      await secondView.unmount();
    }
  } finally {
    /* both views unmounted above */
  }
});

test('walkthrough — partial setup shows honest progress; completed setup hides the card', async () => {
  beforeEach();
  seedPreferences();
  const dress = addDress(dressInput);

  const first = await renderElement(createElement(MemoryRouter, null, createElement(DashboardPage)));
  try {
    const text = first.container.textContent;
    assert.doesNotMatch(text, /لم تبدأ بيانات المعرض بعد/, 'not empty anymore');
    assert.match(text, /أتممتِ 1 من 3 خطوات/, 'honest 1/3 progress from real state');
    assert.match(text, /المخزون بدأ/, 'done step reads as done');
    const pending = [...first.container.querySelectorAll('article[aria-label="جاهزية المعرض"] a')];
    assert.deepEqual(pending.map((a) => a.getAttribute('href')), ['/customers', '/reservations?new=1'], 'only pending steps stay actionable');
  } finally {
    await first.unmount();
  }

  const customer = addCustomer({ name: 'مريم', phone: '90000030', status: 'normal' });
  createReservationCommand({
    customerId: customer.id, dressId: dress.id, pickupDate: todayISO(), pickupTime: '17:00',
    returnDate: addDaysISO(todayISO(), 2), returnTime: '20:00', depositAmount: 0,
    idempotencyKey: 'walkthrough-complete',
  });

  const second = await renderElement(createElement(MemoryRouter, null, createElement(DashboardPage)));
  try {
    assert.equal(second.container.querySelector('article[aria-label="جاهزية المعرض"]'), null, 'checklist retires at 3/3');
    assert.match(second.container.textContent, /لوحة التحكم/);
  } finally {
    await second.unmount();
  }
});

test('walkthrough — template editor: chip inserts at the caret of the last-focused message', async () => {
  beforeEach();
  seedPreferences();
  const view = await renderElement(createElement(MemoryRouter, null, createElement(MessageTemplatesEditor)));
  try {
    const areas = [...view.container.querySelectorAll('textarea')];
    assert.equal(areas.length, 4, 'one editor per reminder kind');

    // Focus the first message, put the caret at position 4, insert «اسم العميلة».
    const first = areas[0];
    await act(async () => { first.focus(); });
    const original = first.value;
    first.setSelectionRange(4, 4);
    const chip = view.container.querySelector('button[aria-label="إدراج رمز اسم العميلة"]');
    assert.ok(chip, 'chip is a real button with an accessible name');
    await act(async () => { chip.click(); });
    assert.equal(first.value, original.slice(0, 4) + '{{customerName}}' + original.slice(4), 'inserted exactly at the caret');
    assert.match(view.container.textContent, /أُدرج رمز «اسم العميلة»/, 'the owner sees what happened, in words');

    // Focus the SECOND message; the next chip must land there, not in the first.
    const second = areas[1];
    const firstAfter = first.value;
    const secondOriginal = second.value;
    await act(async () => { second.focus(); });
    await act(async () => { view.container.querySelector('button[aria-label="إدراج رمز رقم الحجز"]').click(); });
    assert.equal(second.value, secondOriginal + '{{reservationNumber}}', 'landed at the end of the focused message');
    assert.equal(first.value, firstAfter, 'the unfocused message is untouched');
  } finally {
    await view.unmount();
  }
});

test('walkthrough — system errors card degrades calmly when the backend is not configured', async () => {
  beforeEach();
  const view = await renderElement(createElement(MemoryRouter, null, createElement(SystemErrorsSummary)));
  try {
    assert.match(view.container.textContent, /أخطاء النظام المسجلة/, 'card identity renders first');
    await act(async () => { /* flush the async fetch */ });
    assert.match(view.container.textContent, /غير متاح الآن/, 'honest unavailable state instead of a spin or a crash');
    assert.doesNotMatch(view.container.textContent, /undefined|NaN|\[object/, 'no raw internals ever reach the owner');
  } finally {
    await view.unmount();
  }
});
