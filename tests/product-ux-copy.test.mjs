import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { insertTemplateToken } from '../src/features/reminders/messageTemplates';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path) => readFile(join(repositoryRoot, path), 'utf8');

test('the canonical customer term «العميلات» is the only one on internal surfaces (PX-11 residue)', async () => {
  const dashboard = await readSource('src/features/dashboard/DashboardPage.tsx');
  const reminders = await readSource('src/features/reminders/RemindersPage.tsx');
  const navigation = await readSource('src/app/shell/navigation.ts');

  assert.match(dashboard, /\{ to: '\/customers', label: 'العميلات'/, 'dashboard quick link uses the canonical term');
  assert.match(reminders, /title="تذكيرات العميلات"/, 'reminders page title uses the canonical term');
  assert.match(navigation, /العميلات والحجوزات/, 'navigation group uses the canonical term');
  for (const [name, source] of [['dashboard', dashboard], ['reminders', reminders], ['navigation', navigation]]) {
    assert.ok(!source.includes('العملاء'), `${name} carries no bare «العملاء» remnant`);
  }
});

test('insertTemplateToken inserts at the caret, appends when unknown, and reports the landing caret', () => {
  const appended = insertTemplateToken('مرحباً ', 'customerName', null);
  assert.equal(appended.text, 'مرحباً {{customerName}}');
  assert.equal(appended.caret, 'مرحباً '.length + '{{customerName}}'.length);

  const middle = insertTemplateToken('أهلابك', 'reservationNumber', 4);
  assert.equal(middle.text, 'أهلا{{reservationNumber}}بك');
  assert.equal(middle.caret, 4 + '{{reservationNumber}}'.length);

  for (const bad of [-1, 9999, 1.5, Number.NaN, undefined]) {
    const result = insertTemplateToken('نص', 'brandName', bad);
    assert.equal(result.text, 'نص{{brandName}}', `out-of-range caret ${String(bad)} falls back to appending`);
  }

  // The inserted snippet must render through the existing renderer unchanged.
  const { text } = insertTemplateToken('', 'pickupDate', null);
  assert.equal(text, '{{pickupDate}}');
});

test('template editor chips insert by click into the last-focused message (PX-12)', async () => {
  const editor = await readSource('src/features/preferences/MessageTemplatesEditor.tsx');

  assert.match(editor, /insertTemplateToken\(templates\[activeKind\], placeholder\.token/, 'chips route through the pure helper');
  assert.match(editor, /<(?:button|Button)[\s\S]*?onClick=\{\(\) => insertPlaceholder\(placeholder\)\}[\s\S]*?aria-label=\{`إدراج رمز \$\{placeholder\.label\}`\}/, 'every chip is an accessible shared button');
  assert.match(editor, /onFocus=\{\(event\) => \{[\s\S]*?setActiveKind\(kind\)/, 'the message being edited owns the insertion target');
  assert.match(editor, /setSelectionRange\(target\.value\.length, target\.value\.length\)/, 'fresh focus rests the caret at the end so a chip never prepends a token into a settled message');
  assert.match(editor, /setSelectionRange\(caret, caret\)/, 'the caret lands right after the inserted token');
  assert.match(editor, /اضغطي أي رمز لإدراجه مكان المؤشر/, 'the owner does not need to know token syntax');
});

test('the add-dress form explains the المخزون/الملحقات boundary at the decision point (PX-09)', async () => {
  const modal = await readSource('src/features/dresses/AddDressModal.tsx');

  assert.match(modal, /هنا تُسجَّل القطع الرئيسية التي تُؤجر أو تُباع منفردة/);
  assert.match(modal, /تُضاف من صفحة «الملحقات»/, 'the accessory entry point is named where the confusion happens');
});
