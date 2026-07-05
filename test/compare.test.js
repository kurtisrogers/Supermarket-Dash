import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { compareList, formatGBP, getItemPrice } from '../src/lib/compare.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(readFileSync(join(__dirname, '../src/data/products.json'), 'utf8')).products;
const supermarkets = JSON.parse(
  readFileSync(join(__dirname, '../src/data/supermarkets.json'), 'utf8'),
);

function findBrandedProduct() {
  return (
    products.find((product) => product.id === 'baked-beans-415g-branded' && product.prices?.tesco) ??
    products.find((product) => product.brand === 'Heinz' && product.prices?.tesco) ??
    products.find((product) => product.prices?.tesco?.standard > 0 && product.brand && !product.ownLabel)
  );
}

function findTescoOwnLabelProduct() {
  return (
    products.find((product) => product.id === 'tesco-milk-semi-2l-own-label') ??
    products.find(
      (product) =>
        product.availableAt?.includes('tesco') &&
        product.prices?.tesco?.standard > 0 &&
        (product.ownLabel || /tesco/i.test(product.name)),
    )
  );
}

test('formatGBP formats British currency', () => {
  assert.match(formatGBP(1.5), /£1\.50/);
});

test('getItemPrice applies loyalty pricing when card selected', () => {
  const product = findBrandedProduct();
  assert.ok(product, 'expected a branded product with Tesco pricing');

  const standard = getItemPrice(product, 'tesco', supermarkets, []);
  const clubcard = getItemPrice(product, 'tesco', supermarkets, ['clubcard']);

  assert.ok(standard);
  assert.ok(clubcard);
  if (product.prices.tesco.loyalty != null) {
    assert.ok(standard.price >= clubcard.price);
    assert.equal(clubcard.isLoyalty, true);
  } else {
    assert.equal(standard.price, clubcard.price);
  }
});

test('compareList ranks stores and calculates multi-store savings', () => {
  const branded = findBrandedProduct();
  const ownLabel = findTescoOwnLabelProduct();
  assert.ok(branded && ownLabel);

  const cart = [
    { productId: branded.id, quantity: 2 },
    { productId: ownLabel.id, quantity: 1 },
  ];

  const result = compareList(cart, products, supermarkets, ['clubcard', 'nectar']);

  assert.ok(result.bestSingleStore);
  assert.ok(result.optimalTotal > 0);
  assert.ok(result.savingsMap.length > 0);
  assert.equal(result.itemBreakdown.length, 2);
});

test('compareList assigns each item to cheapest store in savings map', () => {
  const branded = findBrandedProduct();
  assert.ok(branded);

  const cart = [{ productId: branded.id, quantity: 1 }];
  const result = compareList(cart, products, supermarkets, []);

  const cheapestStore = result.itemAssignments[0].storeId;
  const cheapestPrice = result.itemAssignments[0].unitPrice;

  for (const store of supermarkets) {
    const price = getItemPrice(branded, store.id, supermarkets, []);
    if (price) {
      assert.ok(price.price >= cheapestPrice);
    }
  }

  assert.equal(cheapestStore, result.savingsMap[0].storeId);
});
