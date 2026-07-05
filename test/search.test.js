import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { filterProducts } from '../src/lib/search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(
  readFileSync(join(__dirname, '../src/data/products.seed.json'), 'utf8'),
).products;

test('filterProducts returns popular items when query is empty', () => {
  const results = filterProducts(products, '', 12);
  assert.equal(results.length, 12);
});

test('filterProducts finds milk by name', () => {
  const results = filterProducts(products, 'milk');
  assert.ok(results.some((p) => p.id === 'milk-semi-2l'));
});

test('filterProducts finds milk by search term', () => {
  const results = filterProducts(products, 'semi skimmed');
  assert.ok(results.some((p) => p.id === 'milk-semi-2l'));
});

test('filterProducts is case-insensitive', () => {
  const results = filterProducts(products, 'MILK');
  assert.ok(results.some((p) => p.id === 'milk-semi-2l'));
});

test('filterProducts matches category', () => {
  const results = filterProducts(products, 'dairy');
  assert.ok(results.length > 0);
  assert.ok(results.every((p) => p.category.toLowerCase().includes('dairy')));
});

test('filterProducts returns empty array when nothing matches', () => {
  const results = filterProducts(products, 'xyznonexistent');
  assert.equal(results.length, 0);
});

test('filterProducts handles partial mobile-style typing', () => {
  for (const query of ['m', 'mi', 'mil', 'milk']) {
    const results = filterProducts(products, query);
    assert.ok(results.some((p) => p.id === 'milk-semi-2l'), `expected milk for query "${query}"`);
  }
});
