import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const sourceRoot = join(repositoryRoot, 'src');

const aliases = {
  '@app': join(sourceRoot, 'app'),
  '@modules': join(sourceRoot, 'modules'),
  '@engines': join(sourceRoot, 'engines'),
  '@platform': join(sourceRoot, 'platform'),
  '@shared': join(sourceRoot, 'shared'),
};

const targetRoots = new Set(['app', 'modules', 'engines', 'platform', 'shared']);
const legacyRoots = new Set(['features', 'services', 'components', 'pages']);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const runtimeAccessPatterns = [
  ['localStorage', /\b(?:window\.)?localStorage\b/],
  ['sessionStorage', /\b(?:window\.)?sessionStorage\b/],
  ['IndexedDB', /\bindexedDB\b/],
  ['Tauri API', /from\s+['"]@tauri-apps\//],
  ['camera/media devices', /\bnavigator\.mediaDevices\b/],
  ['popup API', /\bwindow\.open\s*\(/],
  ['print API', /\bwindow\.print\s*\(/],
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(path) {
  if (!(await exists(path))) return [];

  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(path, entry.name);
      if (entry.isDirectory()) return walk(entryPath);
      if (!entry.isFile()) return [];
      const extension = entry.name.slice(entry.name.lastIndexOf('.'));
      return sourceExtensions.has(extension) ? [entryPath] : [];
    }),
  );

  return nested.flat();
}

function extractImportSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }

  return [...specifiers];
}

function resolveInternalImport(sourceFile, specifier) {
  for (const [alias, aliasRoot] of Object.entries(aliases)) {
    if (specifier === alias) return aliasRoot;
    if (specifier.startsWith(`${alias}/`)) return join(aliasRoot, specifier.slice(alias.length + 1));
  }

  if (specifier.startsWith('.')) return resolve(dirname(sourceFile), specifier);
  return null;
}

function pathPartsInsideSource(path) {
  const pathFromSource = relative(sourceRoot, path);
  if (!pathFromSource || pathFromSource.startsWith(`..${sep}`) || pathFromSource === '..') return [];
  return pathFromSource.split(sep);
}

function isPublicCrossModuleImport(specifier, targetModule) {
  return specifier === `@modules/${targetModule}` || specifier === `@modules/${targetModule}/index`;
}

async function collectBoundaryViolations() {
  const files = (
    await Promise.all([...targetRoots].map((root) => walk(join(sourceRoot, root))))
  ).flat();
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const sourceParts = pathPartsInsideSource(file);
    const sourceRootName = sourceParts[0];

    if (sourceRootName !== 'platform') {
      for (const [label, pattern] of runtimeAccessPatterns) {
        if (pattern.test(source)) {
          violations.push(`${relative(repositoryRoot, file)} accesses ${label} outside src/platform`);
        }
      }
    }

    for (const specifier of extractImportSpecifiers(source)) {
      const targetPath = resolveInternalImport(file, specifier);
      if (!targetPath) continue;

      const targetParts = pathPartsInsideSource(targetPath);
      const targetRootName = targetParts[0];
      if (!targetRootName) continue;

      if (sourceRootName === 'shared' && ['app', 'modules', 'engines', 'platform'].includes(targetRootName)) {
        violations.push(`${relative(repositoryRoot, file)}: shared cannot import ${specifier}`);
      }

      if (sourceRootName === 'platform' && ['app', 'modules', 'engines'].includes(targetRootName)) {
        violations.push(`${relative(repositoryRoot, file)}: platform cannot import ${specifier}`);
      }

      if (['modules', 'engines', 'platform', 'shared'].includes(sourceRootName) && legacyRoots.has(targetRootName)) {
        violations.push(`${relative(repositoryRoot, file)}: target architecture code cannot import legacy ${specifier}`);
      }

      if (sourceRootName === 'modules' && targetRootName === 'modules') {
        const sourceModule = sourceParts[1];
        const targetModule = targetParts[1];
        if (sourceModule && targetModule && sourceModule !== targetModule && !isPublicCrossModuleImport(specifier, targetModule)) {
          violations.push(
            `${relative(repositoryRoot, file)}: cross-module import must use @modules/${targetModule}, received ${specifier}`,
          );
        }
      }
    }
  }

  return violations;
}

test('TypeScript and Vite expose the approved architecture aliases', async () => {
  const tsconfig = JSON.parse(await readFile(join(repositoryRoot, 'tsconfig.json'), 'utf8'));
  assert.equal(tsconfig.compilerOptions.baseUrl, '.');

  const expectedPaths = {
    '@app/*': ['src/app/*'],
    '@modules/*': ['src/modules/*'],
    '@engines/*': ['src/engines/*'],
    '@platform/*': ['src/platform/*'],
    '@shared/*': ['src/shared/*'],
  };
  assert.deepEqual(tsconfig.compilerOptions.paths, expectedPaths);

  const viteConfig = await readFile(join(repositoryRoot, 'vite.config.ts'), 'utf8');
  for (const alias of Object.keys(aliases)) {
    assert.match(viteConfig, new RegExp(`['"]${alias}['"]\\s*:`), `Vite alias ${alias} is missing`);
  }
});

test('target architecture folders respect dependency and platform boundaries', async () => {
  const violations = await collectBoundaryViolations();
  assert.deepEqual(violations, [], `Architecture violations:\n${violations.join('\n')}`);
});
