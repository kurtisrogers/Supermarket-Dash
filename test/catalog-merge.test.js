import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeStoreCatalogs, normalizeMatchKey } from '../src/lib/catalog-merge.js';

test('normalizeMatchKey groups branded products by barcode', () => {
  const key = normalizeMatchKey({
    barcode: '5016000120518',
    storeId: 'tesco',
    id: 'tesco-heinz',
  });
  assert.equal(key, 'barcode:5016000120518');
});

test('normalizeMatchKey keeps own-label products separate per store', () => {
  const tesco = normalizeMatchKey({
    productGroup: 'baked-beans-415g',
    storeId: 'tesco',
    id: 'tesco-own',
  });
  const sainsburys = normalizeMatchKey({
    productGroup: 'baked-beans-415g',
    storeId: 'sainsburys',
    id: 'sainsburys-own',
  });
  assert.notEqual(tesco, sainsburys);
});

test('mergeStoreCatalogs combines branded prices across stores', () => {
  const catalogs = [
    {
      meta: { storeId: 'tesco' },
      products: [
        {
          id: 'tesco-heinz',
          storeId: 'tesco',
          name: 'Heinz Baked Beans 415g',
          brand: 'Heinz',
          barcode: '5016000120518',
          category: 'Cupboard',
          price: { standard: 1.4, loyalty: 1.2 },
          sku: '111',
        },
      ],
    },
    {
      meta: { storeId: 'sainsburys' },
      products: [
        {
          id: 'sainsburys-heinz',
          storeId: 'sainsburys',
          name: 'Heinz Baked Beans 415g',
          brand: 'Heinz',
          barcode: '5016000120518',
          category: 'Cupboard',
          price: { standard: 1.45, loyalty: 1.25 },
          sku: '222',
        },
      ],
    },
  ];

  const merged = mergeStoreCatalogs(catalogs);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].prices.tesco.standard, 1.4);
  assert.equal(merged[0].prices.sainsburys.standard, 1.45);
  assert.equal(merged[0].skus.tesco, '111');
});

test('mergeStoreCatalogs keeps own-label items as separate unified products', () => {
  const catalogs = [
    {
      meta: { storeId: 'tesco' },
      products: [
        {
          id: 'tesco-own',
          storeId: 'tesco',
          name: 'Tesco Baked Beans 415g',
          brand: 'Tesco',
          ownLabel: true,
          productGroup: 'baked-beans-415g',
          category: 'Cupboard',
          price: { standard: 0.45, loyalty: 0.35 },
        },
      ],
    },
    {
      meta: { storeId: 'sainsburys' },
      products: [
        {
          id: 'sainsburys-own',
          storeId: 'sainsburys',
          name: "Sainsbury's Baked Beans 415g",
          brand: "Sainsbury's",
          ownLabel: true,
          productGroup: 'baked-beans-415g',
          category: 'Cupboard',
          price: { standard: 0.5, loyalty: 0.4 },
        },
      ],
    },
  ];

  const merged = mergeStoreCatalogs(catalogs);
  assert.equal(merged.length, 2);
  assert.ok(merged.every((product) => Object.keys(product.prices).length === 1));
});
