import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundledPath = join(ROOT, 'docs/js/app.js');

test('bundled app.js is valid browser script without module syntax', () => {
  const bundled = readFileSync(bundledPath, 'utf8');

  assert.doesNotMatch(bundled, /\bimport\s+/, 'bundled app.js must not contain import statements');
  assert.doesNotMatch(bundled, /^export\s+/m, 'bundled app.js must not contain export statements');
  assert.match(bundled, /function supermarketDash\(/, 'bundled app.js must define supermarketDash');
  assert.match(bundled, /window\.SupermarketSearch/, 'bundled app.js must attach SupermarketSearch globals');
});
