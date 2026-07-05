import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { filterProducts } from '../src/lib/search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(readFileSync(join(__dirname, '../src/data/products.json'), 'utf8')).products;

test('filterProducts returns popular items when query is empty', () => {
  const results = filterProducts(products, '', 12);
  assert.equal(results.length, 12);
});

test('filterProducts finds milk by name', () => {
  const results = filterProducts(products, 'milk');
  assert.ok(results.some((product) => product.name.toLowerCase().includes('milk')));
});

test('filterProducts finds branded Heinz beans', () => {
  const results = filterProducts(products, 'heinz');
  assert.ok(results.some((product) => product.brand === 'Heinz'));
});

test('filterProducts finds milk by search term', () => {
  const results = filterProducts(products, 'semi skimmed', 100);
  assert.ok(results.some((product) => /semi[- ]skimmed/i.test(product.name)));
});

test('filterProducts is case-insensitive', () => {
  const results = filterProducts(products, 'MILK');
  assert.ok(results.some((product) => product.name.toLowerCase().includes('milk')));
});

test('filterProducts matches category', () => {
  const sample = products.find((product) => product.category);
  assert.ok(sample);
  const term = sample.category.split(/\s+/)[0].toLowerCase();
  const results = filterProducts(products, term);
  assert.ok(results.length > 0);
  assert.ok(results.some((product) => product.category.toLowerCase().includes(term)));
});

test('filterProducts returns empty array when nothing matches', () => {
  const results = filterProducts(products, 'xyznonexistent');
  assert.equal(results.length, 0);
});

test('filterProducts handles partial mobile-style typing', () => {
  for (const query of ['mil', 'milk']) {
    const results = filterProducts(products, query);
    assert.ok(
      results.some((product) => product.name.toLowerCase().includes('milk')),
      `expected milk for query "${query}"`,
    );
  }

  const singleLetter = filterProducts(products, 'm', 50);
  assert.ok(singleLetter.length > 0);
});
