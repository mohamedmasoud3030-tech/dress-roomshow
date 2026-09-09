import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { formatMoneyOMR } from '../src/shared/utils/format.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path) => readFile(join(repositoryRoot, path), 'utf8');

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { recursive: true });
  return entries.filter((name) => /\.(ts|tsx)$/.test(name)).map((name) => join(dir, name));
}

test('ar-OM is the only formatting locale in the entire app (ar-EG leak stays fixed)', async () => {
  const files = await collectSourceFiles(join(repositoryRoot, 'src'));
  const offenders = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (source.includes('ar-EG')) offenders.push(`${file}: ar-EG`);

    const toLocaleCalls = source.match(/\btoLocale(?:String|DateString|TimeString)\(/g) ?? [];
    const canonicalCalls = source.match(/\btoLocale(?:String|DateString|TimeString)\('ar-OM'/g) ?? [];
    if (toLocaleCalls.length !== canonicalCalls.length) {
      offenders.push(`${file}: ${toLocaleCalls.length - canonicalCalls.length} toLocale* call(s) without literal 'ar-OM'`);
    }

    for (const match of source.matchAll(/Intl\.(?:NumberFormat|DateTimeFormat)\(\s*'([^']+)'/g)) {
      if (match[1] !== 'ar-OM') offenders.push(`${file}: Intl.* with locale ${match[1]}`);
    }
  }

  assert.deepEqual(offenders, [], 'every formatting call site uses the canonical ar-OM locale');
});

test('mixed-direction values stay isolated (phones, emails, whatsapp, tokens)', async () => {
  const contact = await readSource('src/pages/landing/components/LandingContact.tsx');
  const ltrSpans = (contact.match(/dir="ltr"/g) ?? []).length;
  assert.ok(ltrSpans >= 4, `landing contact isolates every contact value (found ${ltrSpans})`);
  // The landing contact rows are multi-line JSX; match across lines.
  assert.match(contact, /<a\s+href=\{primaryPhoneHref\}[\s\S]*?dir="ltr"/, 'primary phone is ltr-isolated');
  assert.match(contact, /<a\s+href=\{primaryEmailHref\}[\s\S]*?dir="ltr"/, 'primary email is ltr-isolated');

  const editor = await readSource('src/features/preferences/MessageTemplatesEditor.tsx');
  assert.match(editor, /<span dir="ltr">\{`\{\{\$\{placeholder\.token\}\}\}`\}<\/span>/, 'template tokens render ltr inside rtl copy');
});

test('the Omani rial formats canonically: 3 fraction digits, ar-OM shaping', () => {
  const rendered = formatMoneyOMR(45);
  // ar-OM CLDR defaults shape digits as Arabic-Indic (٤٥٫٠٠٠) — accept either
  // shaping so ICU upgrades cannot flip the contract silently.
  assert.match(rendered, /(45|٤٥)[.,٫](000|٠٠٠)/, `amount keeps OMR 3-decimal precision: ${rendered}`);
  assert.match(rendered, /ر\.ع/, `currency renders with the Omani rial label: ${rendered}`);
  assert.doesNotMatch(rendered, /OMR/, 'never shows the ISO code to the operator');
});

test('app shell and PWA metadata stay Arabic-first end to end', async () => {
  const html = await readSource('index.html');
  assert.match(html, /<html lang="ar" dir="rtl">/);

  const viteConfig = await readSource('vite.config.ts');
  assert.match(viteConfig, /dir: 'rtl'/, 'manifest dir');
  assert.match(viteConfig, /lang: 'ar'/, 'manifest lang');

  const title = await readSource('src/app/router/DocumentTitle.tsx');
  assert.match(title, /useBrandName\(\)/, 'the brand suffix comes from the showroom profile, never hardcoded');
  assert.match(title, /\$\{label\} \| \$\{brandName\}/, 'route-specific Arabic titles keep the brand suffix');
});
