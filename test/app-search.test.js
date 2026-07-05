import test from 'node:test';
import assert from 'node:assert/strict';

import { filterProducts } from '../src/lib/search.js';

/**
 * Mirrors the app's applySearch() — explicit state update instead of a reactive getter.
 */
function applySearch(products, currentQuery, nextValue) {
  const query = typeof nextValue === 'string' ? nextValue : currentQuery;
  return {
    searchQuery: query,
    filteredProducts: filterProducts(products, query),
  };
}

const sampleProducts = [
  { id: 'milk', name: 'Semi-Skimmed Milk 2L', category: 'Dairy', searchTerms: ['semi skimmed milk 2l'] },
  { id: 'bread', name: 'White Bread 800g', category: 'Bakery', searchTerms: ['white bread 800g'] },
];

test('applySearch updates explicit filteredProducts state for each keystroke', () => {
  let state = applySearch(sampleProducts, '', '');

  state = applySearch(sampleProducts, state.searchQuery, 'm');
  assert.equal(state.searchQuery, 'm');
  assert.ok(state.filteredProducts.some((p) => p.id === 'milk'));

  state = applySearch(sampleProducts, state.searchQuery, 'mi');
  assert.equal(state.searchQuery, 'mi');
  assert.ok(state.filteredProducts.some((p) => p.id === 'milk'));

  state = applySearch(sampleProducts, state.searchQuery, 'milk');
  assert.equal(state.searchQuery, 'milk');
  assert.deepEqual(
    state.filteredProducts.map((p) => p.id),
    ['milk'],
  );
});

test('applySearch replaces filtered list reference on each call', () => {
  const first = applySearch(sampleProducts, '', 'milk');
  const second = applySearch(sampleProducts, first.searchQuery, 'bread');
  assert.notEqual(first.filteredProducts, second.filteredProducts);
  assert.deepEqual(
    second.filteredProducts.map((p) => p.id),
    ['bread'],
  );
});
