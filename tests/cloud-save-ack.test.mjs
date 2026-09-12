// jsdom globals must exist before react-dom evaluates — see the harness note.
import { act, dom, renderElement, resetDomEnvironment } from './helpers/jsdom-react.mjs';

import test from 'node:test';
import { readSource } from './helpers/readSource.mjs';
import assert from 'node:assert/strict';
import React from 'react';

import { CloudSaveAckToast } from '../src/components/shared/CloudSaveAckToast.tsx';
import {
  CLOUD_SAVE_ACK_DISMISS_MS,
  CLOUD_SAVE_ACK_EVENT,
  CLOUD_SAVE_ACK_MESSAGE,
  isCloudSaveAck,
  isMoneyTouchingCommand,
  publishCloudSaveAck,
} from '../src/shared/persistence/cloudSaveAck.ts';

const MONEY_COMMANDS = [
  'payment.record',
  'payment.settle-return',
  'expense.post',
  'sale.create-invoice',
  'sale.return-line',
  'reservation.create',
  'reservation.cancel',
  'reservation.returnLine',
  'daily-close.close',
  'daily-close.reopen',
  'delivery.complete',
  'return.complete',
  'accessory.attach',
  'accessory.detach',
  'service.complete',
];

const NOT_MONEY_COMMANDS = [
  'customer.create',
  'customer.update',
  'customer.archive',
  'inventory.create',
  'inventory.update',
  'inventory.images',
  'appointment.book',
  'reminder.dismiss',
  'preferences.save',
  'waitlist.create',
  'stocktake.start',
  'database.import',
  'database.reset',
  'storage.migrate-images',
];

test('the acknowledgement fires for money operations only', () => {
  for (const name of MONEY_COMMANDS) {
    assert.equal(isMoneyTouchingCommand(name), true, `${name} moves money and must be acknowledged`);
  }
  for (const name of NOT_MONEY_COMMANDS) {
    assert.equal(isMoneyTouchingCommand(name), false, `${name} is not a money operation`);
  }
  assert.equal(isMoneyTouchingCommand(''), false);
  assert.equal(isMoneyTouchingCommand(undefined), false, 'a missing command name is not a money operation');
});

test('the toast copy is fixed, Arabic, and carries no figures', () => {
  assert.equal(CLOUD_SAVE_ACK_MESSAGE, 'محفوظ على الخادم ✓');
  assert.doesNotMatch(CLOUD_SAVE_ACK_MESSAGE, /[0-9٠-٩]/, 'no digits: an operator must never read money off a fading popup');
  assert.doesNotMatch(CLOUD_SAVE_ACK_MESSAGE, /ر\.ع|OMR/, 'no currency label either');
  assert.ok(CLOUD_SAVE_ACK_DISMISS_MS <= 4000, `the roadmap ceiling is 4 s, got ${CLOUD_SAVE_ACK_DISMISS_MS} ms`);
  assert.ok(CLOUD_SAVE_ACK_DISMISS_MS >= 1000, 'anything shorter is a flicker, not an acknowledgement');
});

test('a malformed event payload is ignored instead of trusted', () => {
  assert.equal(isCloudSaveAck({ commandName: 'payment.record', revision: 3, at: new Date().toISOString() }), true);
  assert.equal(isCloudSaveAck({ commandName: 'payment.record', at: 'now' }), false, 'revision is required');
  assert.equal(isCloudSaveAck({ revision: 3, at: 'now' }), false);
  assert.equal(isCloudSaveAck(null), false);
  assert.equal(isCloudSaveAck('payment.record'), false);
});

test('publishing filters non-money commands before touching the event bus', () => {
  resetDomEnvironment();
  let received = 0;
  const listener = () => { received += 1; };
  dom.window.addEventListener(CLOUD_SAVE_ACK_EVENT, listener);

  try {
    assert.equal(publishCloudSaveAck('customer.create', 12), false, 'a contact edit is not worth a toast');
    assert.equal(received, 0);

    assert.equal(publishCloudSaveAck('payment.record', 12), true);
    assert.equal(received, 1, 'the confirmed money write was announced');

    // No server revision means there was no acknowledgement to report.
    assert.equal(publishCloudSaveAck('payment.record', Number.NaN), false);
    assert.equal(received, 1);
  } finally {
    dom.window.removeEventListener(CLOUD_SAVE_ACK_EVENT, listener);
  }
});

test('the toast appears for a server ack and dismisses itself', async () => {
  resetDomEnvironment();
  const { container, unmount } = await renderElement(
    React.createElement(CloudSaveAckToast, { dismissMs: 40 }),
  );

  assert.equal(container.querySelector('[role="status"]'), null, 'silent until something is confirmed');

  await act(async () => {
    dom.window.dispatchEvent(new CustomEvent(CLOUD_SAVE_ACK_EVENT, {
      detail: { commandName: 'payment.record', revision: 7, at: new Date().toISOString() },
    }));
  });

  const toast = container.querySelector('[role="status"]');
  assert.ok(toast, 'the acknowledgement is announced, not just drawn');
  assert.equal(toast.getAttribute('aria-live'), 'polite', 'it must not interrupt a spoken flow');
  assert.equal(toast.textContent, CLOUD_SAVE_ACK_MESSAGE);
  assert.match(toast.className, /pointer-events-none/, 'it must never block the button under it');
  assert.match(toast.className, /safe-area-inset-bottom/, 'it must clear the phone home indicator');

  // A second confirmed write replaces the first instead of stacking.
  await act(async () => {
    dom.window.dispatchEvent(new CustomEvent(CLOUD_SAVE_ACK_EVENT, {
      detail: { commandName: 'expense.post', revision: 8, at: new Date().toISOString() },
    }));
  });
  assert.equal(container.querySelectorAll('[role="status"]').length, 1, 'one acknowledgement at a time');

  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 90)); });
  assert.equal(container.querySelector('[role="status"]'), null, 'it goes away on its own');

  await unmount();
});

test('the acknowledgement is published only after the server confirms the write', async () => {
  const gate = await readSource('src/features/sync/CloudDataGate.tsx');

  const start = gate.indexOf('const handleCommit');
  const end = gate.indexOf('window.addEventListener(SHOWROOM_COMMAND_COMMITTED_EVENT');
  assert.ok(start > -1 && end > start, 'the commit handler must exist');
  const [successPath, failurePath] = gate.slice(start, end).split('} catch (reason) {');
  assert.ok(failurePath, 'the handler must still own a failure path');

  assert.match(successPath, /publishCloudSaveAck\(detail\.commandName, committed\.revision\)/,
    'the ack carries the command and the server-assigned revision');
  assert.doesNotMatch(failurePath, /publishCloudSaveAck/,
    'a failed or offline write must never claim it was saved — the amber banner owns that case');
  assert.ok(
    successPath.indexOf('publishCloudSaveAck') > successPath.indexOf("state: 'synced'"),
    'the ack follows the confirmed sync, never precedes it',
  );
});

test('the toast lives on operational routes and never on the public landing', async () => {
  const shell = await readSource('src/app/shell/AppShell.tsx');
  const app = await readSource('src/app/App.tsx');

  assert.match(shell, /<CloudSaveAckToast \/>/, 'mounted once, above every operational route');
  assert.doesNotMatch(app, /CloudSaveAckToast/, 'the anonymous landing page never commits money, so it never shows this');
});
