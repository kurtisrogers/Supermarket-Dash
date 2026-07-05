import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractSkuFromUrl,
  inferBrand,
  mapPepestoCatalog,
  mapPepestoProduct,
  priceFromMinor,
} from '../src/lib/pepesto-catalog.js';

describe('priceFromMinor', () => {
  it('converts GBP pence to pounds', () => {
    assert.equal(priceFromMinor(199, 'GBP'), 1.99);
    assert.equal(priceFromMinor(340, 'GBP'), 3.4);
  });
});

describe('extractSkuFromUrl', () => {
  it('extracts numeric SKU from supermarket URL', () => {
    const url = 'https://www.tesco.com/groceries/en-GB/products/258372015';
    assert.equal(extractSkuFromUrl(url, 'tesco'), '258372015');
  });
});

describe('inferBrand', () => {
  it('detects Tesco own-label', () => {
    const result = inferBrand('Tesco Semi-Skimmed Milk 2L', 'tesco');
    assert.equal(result.ownLabel, true);
    assert.equal(result.brand, 'Tesco');
  });

  it('detects Heinz as branded', () => {
    const result = inferBrand('Heinz Baked Beans 415g', 'tesco');
    assert.equal(result.ownLabel, false);
    assert.equal(result.brand, 'Heinz');
  });
});

describe('mapPepestoProduct', () => {
  it('maps catalog entry with promo loyalty price', () => {
    const item = {
      entity_name: 'Baked beans',
      names: { en: 'Heinz Baked Beans' },
      price: 140,
      currency: 'GBP',
      quantity_str: '415g',
    };

    const mapped = mapPepestoProduct('tesco', 'https://www.tesco.com/p/5016000120518', item, 120);
    assert.ok(mapped);
    assert.equal(mapped.price.standard, 1.4);
    assert.equal(mapped.price.loyalty, 1.2);
    assert.equal(mapped.ownLabel, false);
  });
});

describe('mapPepestoCatalog', () => {
  it('maps full parsed_products object', () => {
    const catalog = {
      'https://www.tesco.com/p/123456789': {
        entity_name: 'Milk',
        names: { en: 'Tesco Semi-Skimmed Milk' },
        price: 145,
        currency: 'GBP',
        quantity_str: '2L',
      },
    };

    const products = mapPepestoCatalog('tesco', catalog);
    assert.equal(products.length, 1);
    assert.equal(products[0].storeId, 'tesco');
  });
});
