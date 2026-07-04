import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { compareList, formatGBP, getItemPrice } from '../src/lib/compare.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(
  readFileSync(join(__dirname, '../src/data/products.seed.json'), 'utf8'),
).products;
const supermarkets = JSON.parse(
  readFileSync(join(__dirname, '../src/data/supermarkets.json'), 'utf8'),
);

test('formatGBP formats British currency', () => {
  assert.match(formatGBP(1.5), /£1\.50/);
});

test('getItemPrice applies loyalty pricing when card selected', () => {
  const milk = products.find((p) => p.id === 'milk-semi-2l');
  const standard = getItemPrice(milk, 'tesco', supermarkets, []);
  const clubcard = getItemPrice(milk, 'tesco', supermarkets, ['clubcard']);

  assert.ok(standard.price > clubcard.price);
  assert.equal(clubcard.isLoyalty, true);
});

test('compareList ranks stores and calculates multi-store savings', () => {
  const cart = [
    { productId: 'milk-semi-2l', quantity: 2 },
    { productId: 'bread-white-800g', quantity: 1 },
  ];

  const result = compareList(cart, products, supermarkets, ['clubcard', 'nectar']);

  assert.ok(result.bestSingleStore);
  assert.ok(result.optimalTotal > 0);
  assert.ok(result.savingsMap.length > 0);
  assert.equal(result.itemBreakdown.length, 2);
});

test('compareList assigns each item to cheapest store in savings map', () => {
  const cart = [{ productId: 'milk-semi-2l', quantity: 1 }];
  const result = compareList(cart, products, supermarkets, []);

  const cheapestStore = result.itemAssignments[0].storeId;
  const cheapestPrice = result.itemAssignments[0].unitPrice;

  for (const store of supermarkets) {
    const price = getItemPrice(
      products.find((p) => p.id === 'milk-semi-2l'),
      store.id,
      supermarkets,
      [],
    );
    if (price) {
      assert.ok(price.price >= cheapestPrice);
    }
  }

  assert.equal(cheapestStore, result.savingsMap[0].storeId);
});
