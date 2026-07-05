/**
 * Generate per-supermarket catalog seed files from shared product templates.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { productTemplates, storeLabels, storePriceFactor } from '../src/data/catalog-definitions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(__dirname, '../src/data/catalogs');

const STORE_OFFSET = {
  tesco: 0,
  sainsburys: 100000,
  asda: 200000,
  morrisons: 300000,
  aldi: 400000,
  lidl: 500000,
  waitrose: 600000,
  ocado: 700000,
};

function scalePrice(price, storeId) {
  const factor = storePriceFactor[storeId] ?? 1;
  const round = (value) => Math.round(value * factor * 100) / 100;

  return {
    standard: round(price.standard),
    loyalty: price.loyalty != null ? round(price.loyalty) : null,
  };
}

function makeSku(skuBase, storeId) {
  return String(skuBase + (STORE_OFFSET[storeId] ?? 0));
}

function buildStoreProduct(storeId, template, variant, variantType) {
  const isOwnLabel = variantType === 'ownLabel';
  const storeLabel = storeLabels[storeId];
  const name = isOwnLabel ? `${storeLabel} ${variant.name}` : variant.name;

  return {
    id: `${storeId}-${template.productGroup}-${variantType}`,
    unifiedId: isOwnLabel ? `${storeId}-${template.productGroup}-own-label` : `${template.productGroup}-branded`,
    productGroup: template.productGroup,
    storeId,
    name,
    brand: isOwnLabel ? storeLabel : variant.brand,
    storeLabel: isOwnLabel ? storeLabel : null,
    barcode: variant.barcode ?? null,
    category: template.category,
    searchTerms: [...template.searchTerms, name.toLowerCase()],
    ownLabel: isOwnLabel,
    sku: makeSku(variant.skuBase, storeId),
    price: scalePrice(variant.price, storeId),
  };
}

function generateStoreCatalog(storeId) {
  const products = [];

  for (const template of productTemplates) {
    if (template.branded) {
      products.push(buildStoreProduct(storeId, template, template.branded, 'branded'));
    }
    if (template.ownLabel) {
      products.push(buildStoreProduct(storeId, template, template.ownLabel, 'ownLabel'));
    }
  }

  return {
    meta: {
      storeId,
      source: 'seed',
      generatedAt: new Date().toISOString(),
      productCount: products.length,
    },
    products,
  };
}

function main() {
  mkdirSync(CATALOG_DIR, { recursive: true });

  for (const storeId of Object.keys(storeLabels)) {
    const catalog = generateStoreCatalog(storeId);
    const path = join(CATALOG_DIR, `${storeId}.seed.json`);
    writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
    console.log(`✓ ${storeId}: ${catalog.products.length} products → ${path}`);
  }
}

main();
