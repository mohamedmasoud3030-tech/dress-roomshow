// jsdom globals must exist before react-dom evaluates — see the harness note.
import { dom, renderElement, resetDomEnvironment } from './helpers/jsdom-react.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import React from 'react';

import { PreferencesSectionGroup } from '../src/features/preferences/PreferencesSectionGroup.tsx';
import {
  DESTRUCTIVE_SECTION_ID,
  PREFERENCES_SECTIONS,
  focusPreferencesSection,
  getPreferencesSection,
  preferencesSectionHeadingId,
} from '../src/features/preferences/preferencesSections.ts';
import { runGuardedSettingsAction } from '../src/features/preferences/runSettingsAction.ts';

const read = (path) => readFile(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

test('the settings groups are one ordered registry and the destructive one is last', () => {
  const ids = PREFERENCES_SECTIONS.map((section) => section.id);

  assert.equal(new Set(ids).size, ids.length, 'every group id is unique');
  assert.deepEqual(
    ids,
    [
      'data-backup',
      'operations',
      'accounts',
      'messages',
      'printing',
      'public-profile',
      'monitoring',
      'about',
      'danger-zone',
    ],
    'the tab order is the product order: data safety first, destructive last',
  );
  assert.equal(ids[ids.length - 1], DESTRUCTIVE_SECTION_ID, 'the destructive group is always last');

  for (const section of PREFERENCES_SECTIONS) {
    assert.ok(section.label.length > 0, `${section.id} needs a tab label`);
    assert.ok(!/[a-zA-Z]/.test(section.label), `${section.id} label must be Arabic only: ${section.label}`);
    assert.ok(section.description.length > 10, `${section.id} needs a one-line description`);
    assert.equal(getPreferencesSection(section.id), section);
  }
  assert.throws(() => getPreferencesSection('does-not-exist'), /Unknown preferences section/);
});

test('opening a tab lands the keyboard inside the group it opened', async () => {
  resetDomEnvironment();
  const { container, unmount } = await renderElement(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(PreferencesSectionGroup, { id: 'messages' }, React.createElement('p', null, 'محتوى')),
      React.createElement(PreferencesSectionGroup, { id: 'printing' }, React.createElement('p', null, 'محتوى')),
    ),
  );

  const section = container.querySelector('#messages');
  assert.ok(section, 'the group renders with its anchor id');
  assert.equal(section.tagName, 'SECTION');
  assert.equal(section.getAttribute('tabindex'), '-1', 'focusable as a target, never a tab stop');
  assert.equal(section.getAttribute('aria-labelledby'), 'messages-heading');
  assert.equal(container.querySelector('#messages-heading').textContent, 'الرسائل');
  assert.match(section.className, /scroll-mt-28/, 'the sticky header must not cover the anchored heading');

  focusPreferencesSection('messages');
  assert.equal(dom.window.document.activeElement.id, 'messages', 'focus moved into the group');

  focusPreferencesSection('printing');
  assert.equal(dom.window.document.activeElement.id, 'printing', 'focus follows the tab that was pressed');

  // A stale deep link to a group that is not rendered is a no-op, not a crash,
  // and it must not steal focus from where the operator already is.
  assert.doesNotThrow(() => focusPreferencesSection('never-rendered'));
  assert.equal(dom.window.document.activeElement.id, 'printing');

  await unmount();
});

test('the destructive group keeps its own visual warning', async () => {
  resetDomEnvironment();
  const { container, unmount } = await renderElement(
    React.createElement(PreferencesSectionGroup, { id: 'danger-zone' }, React.createElement('p', null, 'x')),
  );

  const heading = container.querySelector('#danger-zone-heading');
  assert.equal(heading.textContent, 'منطقة الخطر');
  assert.match(heading.className, /text-rose-900/, 'the destructive heading stays red');
  assert.match(container.querySelector('p').className, /text-rose-800/);
  assert.equal(preferencesSectionHeadingId('danger-zone'), 'danger-zone-heading');

  await unmount();
});

test('every registry group is actually rendered, once, in registry order', async () => {
  const page = await read('src/features/preferences/PreferencesPage.tsx');

  const rendered = [...page.matchAll(/<PreferencesSectionGroup id="([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(rendered, PREFERENCES_SECTIONS.map((section) => section.id), 'rendered order matches the registry');

  for (const section of PREFERENCES_SECTIONS) {
    const occurrences = page.split(`id="${section.id}"`).length - 1;
    assert.equal(occurrences, 1, `anchor id ${section.id} must exist exactly once (no duplicate ids)`);
  }

  assert.match(page, /aria-label="أقسام الإعدادات"/, 'the tab strip keeps its accessible name');
  assert.match(page, /PREFERENCES_SECTIONS\.map\(/, 'the tabs are generated from the registry, not hand-listed');
  assert.match(page, /focusPreferencesSection\(/, 'a tab press moves focus, not just the scroll position');
  assert.match(page, /sticky top-\[4\.25rem\] z-10/, 'the tabs stay reachable and sit under the app header');
});

test('the cards the tabs point at are all still on the page', async () => {
  const page = await read('src/features/preferences/PreferencesPage.tsx');

  // Each of these is the payload of one tab. If a group is added to the
  // registry without its card, the tab scrolls to an empty heading.
  for (const marker of [
    '<StorageCapacityIndicator />',
    'نسخ الخادم الاحتياطية',
    'حجم قاعدة البيانات المركزية',
    'تحسين حفظ الصور',
    '<AccountSettings />',
    '<AccountManagement />',
    '<MessageTemplatesEditor />',
    '<PrintSettingsEditor />',
    '<ShowroomProfileEditor />',
    '<SystemErrorsSummary />',
    'عن التطبيق',
    'تصفير جميع البيانات',
  ]) {
    assert.ok(page.includes(marker), `settings lost the content behind a tab: ${marker}`);
  }

  // Ordering proof, not just presence: monitoring follows the public profile and
  // the destructive zone follows everything.
  const order = [
    page.indexOf('<ShowroomProfileEditor />'),
    page.indexOf('<SystemErrorsSummary />'),
    page.indexOf('<PreferencesSectionGroup id="about">'),
    page.indexOf('<PreferencesSectionGroup id="danger-zone">'),
  ];
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'monitoring, about and the danger zone render in that order');
});

test('the shared settings-action contract reports exactly one outcome and always clears the busy flag', async () => {
  const makeReporters = () => {
    const calls = [];
    return {
      calls,
      reporters: {
        setFeedback: (message) => calls.push(['feedback', message]),
        setError: (error) => calls.push(['error', error]),
      },
    };
  };

  // A confirmed success shows its line and clears any previous error.
  let settled = 0;
  let target = makeReporters();
  await runGuardedSettingsAction(target.reporters, async () => 'تم الحفظ.', () => { settled += 1; });
  assert.deepEqual(target.calls, [['feedback', 'تم الحفظ.'], ['error', null]]);
  assert.equal(settled, 1, 'the busy flag clears after a success');

  // A failure shows the failure and drops the success line — never both.
  settled = 0;
  target = makeReporters();
  const boom = new Error('تعذر الحفظ.');
  await runGuardedSettingsAction(target.reporters, async () => { throw boom; }, () => { settled += 1; });
  assert.deepEqual(target.calls, [['error', boom], ['feedback', null]]);
  assert.equal(settled, 1, 'the busy flag clears after a failure');

  // The operator cancelling a confirm dialog leaves the screen untouched.
  settled = 0;
  target = makeReporters();
  await runGuardedSettingsAction(target.reporters, async () => null, () => { settled += 1; });
  assert.deepEqual(target.calls, [], 'a cancel reports nothing and clears no stale error');
  assert.equal(settled, 1, 'a cancel must still release the busy flag');

  // A synchronous throw must not strand the button in its loading state either.
  settled = 0;
  target = makeReporters();
  await runGuardedSettingsAction(target.reporters, () => { throw new Error('sync'); }, () => { settled += 1; });
  assert.equal(settled, 1);
});

test('all four settings data actions route through that one contract', async () => {
  const page = await read('src/features/preferences/PreferencesPage.tsx');

  assert.equal(
    page.split('runSettingsAction(async () => {').length - 1,
    4,
    'export, server-copy restore, server-copy download and backup import share one outcome path',
  );
  assert.match(page, /runGuardedSettingsAction\(\{ setFeedback, setError \}/, 'the page delegates to the tested function');
  assert.doesNotMatch(
    page,
    /setError\(reason\);\s*\n\s*setFeedback\(null\);/,
    'the hand-written copy of the contract must not come back',
  );
});
