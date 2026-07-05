import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterProducts,
  findProductByBarcode,
  findProductsBySku,
  normalizeBarcode,
} from '../src/lib/search.js';

const products = [
  {
    id: 'heinz-beans',
    brand: 'Heinz',
    name: 'Heinz Baked Beans 415g',
    category: 'Cupboard',
    barcode: '5016000120518',
    searchTerms: ['heinz baked beans'],
    skus: { tesco: '258372015', sainsburys: '6449102' },
  },
  {
    id: 'own-milk',
    name: 'Semi-Skimmed Milk 2L',
    category: 'Dairy',
    searchTerms: ['milk 2l'],
  },
];

test('normalizeBarcode strips non-digits', () => {
  assert.equal(normalizeBarcode('5016 0001 20518'), '5016000120518');
});

test('findProductByBarcode matches EAN-13', () => {
  const match = findProductByBarcode(products, '5016000120518');
  assert.equal(match?.id, 'heinz-beans');
});

test('findProductsBySku matches store SKU', () => {
  const matches = findProductsBySku(products, '258372015');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'heinz-beans');
});

test('filterProducts prioritises exact barcode matches', () => {
  const results = filterProducts(products, '5016000120518');
  assert.deepEqual(
    results.map((product) => product.id),
    ['heinz-beans'],
  );
});

test('filterProducts finds branded products by brand name', () => {
  const results = filterProducts(products, 'heinz');
  assert.ok(results.some((product) => product.id === 'heinz-beans'));
});

test('filterProducts finds products by SKU in search box', () => {
  const results = filterProducts(products, '6449102');
  assert.deepEqual(
    results.map((product) => product.id),
    ['heinz-beans'],
  );
});
