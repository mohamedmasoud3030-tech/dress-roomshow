import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

/**
 * Reads a repository-relative file as UTF-8 for source-contract suites.
 *
 * Every contract suite used to restate this one-liner (plus its two `node:url`
 * imports); SonarCloud counts that repeated header as duplicated new code.
 */
export function readSource(relativePath) {
  return readFile(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8');
}

/** Absolute path of a repository-relative file, for suites that need the path itself. */
export function sourcePath(relativePath) {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}
