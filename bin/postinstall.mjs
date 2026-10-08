import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Temporary: these packages omit their own entry from "sideEffects", so esbuild may prune it.
// Delete this script once @decaf-ts/ui-decorators and @decaf-ts/core ship the fix.
const PACKAGES = ['ui-decorators', 'core'];
const ENTRIES = ['./lib/esm/index.js', './lib/cjs/index.cjs'];

for (const pkg of PACKAGES) {
  const pkgJsonPath = resolve(root, 'node_modules/@decaf-ts', pkg, 'package.json');
  if (!existsSync(pkgJsonPath)) continue;

  const json = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  if (!Array.isArray(json.sideEffects)) continue;

  const missing = ENTRIES.filter((entry) => !json.sideEffects.includes(entry));
  if (!missing.length) continue;

  json.sideEffects.unshift(...missing);
  writeFileSync(pkgJsonPath, JSON.stringify(json, null, 2) + '\n');
  console.log(`postinstall: patched @decaf-ts/${pkg} sideEffects`);
}
