import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

const outdir = 'tests/.tmp';

await mkdir(outdir, { recursive: true });

await build({
  entryPoints: [
    'tests/storage-persistence-error.test.mjs',
    'tests/runtime-env.test.mjs',
  ],
  outdir,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  logLevel: 'silent',
});
