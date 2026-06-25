import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { Script } from 'node:vm';
import { transformWithEsbuild } from 'vite';

test('root bootstrap fails loudly when the root element is missing', async () => {
  const source = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
  const runnableSource = source
    .replace(/^import .*;\n/gm, '')
    .replace(
      /ReactDOM\.createRoot\(rootElement\)\.render\([\s\S]*?\);\s*$/,
      'globalThis.__renderWasReached = true;',
    );
  const transformed = await transformWithEsbuild(runnableSource, 'src/main.tsx', {
    format: 'cjs',
    jsx: 'automatic',
    loader: 'tsx',
  });

  const previousDocument = globalThis.document;
  globalThis.document = {
    getElementById: (id) => {
      assert.equal(id, 'root');
      return null;
    },
  };

  try {
    assert.throws(
      () => new Script(transformed.code).runInThisContext(),
      /عنصر تشغيل التطبيق root غير موجود في الصفحة\./,
    );
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    delete globalThis.__rootElement;
    delete globalThis.__renderWasReached;
  }
});
