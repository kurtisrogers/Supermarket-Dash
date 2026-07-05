import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { collectOcadoPlatformProducts, finalizeStoreProduct, parseOcadoPlatformProduct } from '../src/lib/store-fetchers/spider/ocado-platform.js';
import { derefPayload, priceFromMinor, priceFromAmountString } from '../src/lib/store-fetchers/spider/common.js';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/morrisons-search-sample.json');

test('parseOcadoPlatformProduct extracts Morrisons-style decorated product', () => {
  const payload = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const decorated = payload.productGroups[0].decoratedProducts[0];
  const parsed = finalizeStoreProduct(parseOcadoPlatformProduct(decorated), 'morrisons');

  assert.ok(parsed);
  assert.match(parsed.name, /Milk/i);
  assert.equal(parsed.sku, decorated.retailerProductId);
  assert.ok(parsed.price.standard > 0);
});

test('collectOcadoPlatformProducts deduplicates decorated products', () => {
  const payload = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const products = collectOcadoPlatformProducts(payload, 'morrisons');
  assert.ok(products.length >= 1);
});

test('derefPayload resolves numeric references', () => {
  const arr = [0, { title: 2, price: 3 }, 'Semi-Skimmed Milk', { amount: '1.65' }];
  const resolved = derefPayload(arr, 1);
  assert.equal(resolved.title, 'Semi-Skimmed Milk');
  assert.equal(resolved.price.amount, '1.65');
});

test('priceFromMinor converts pence to pounds', () => {
  assert.equal(priceFromMinor(165), 1.65);
  assert.equal(priceFromAmountString('1.65'), 1.65);
});
