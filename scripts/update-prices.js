import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { mergeStoreCatalogs, summarizeCatalogs } from '../src/lib/catalog-merge.js';
import { loadActiveCatalogs, loadJson } from '../src/lib/catalog-load.js';
import { fetchStoreCatalogWithFallback, listStoreIds, STORE_FETCH_CONFIG } from '../src/lib/store-fetchers/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src/data');
const CATALOG_DIR = join(DATA_DIR, 'catalogs');
const OUTPUT_PATH = join(DATA_DIR, 'products.json');
const SUPERMARKETS_PATH = join(DATA_DIR, 'supermarkets.json');

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function ensureTemplateSeedsExist() {
  if (!existsSync(CATALOG_DIR) || !existsSync(join(CATALOG_DIR, 'tesco.seed.json'))) {
    console.log('Generating template seed catalogs (first run only)…');
    spawnSync('node', ['scripts/generate-store-seeds.js'], { cwd: ROOT, stdio: 'inherit' });
  }
}

async function updateStoreSeed(storeId, apiKey) {
  const label = STORE_FETCH_CONFIG[storeId].label;
  console.log(`\n── ${label} (${storeId}) ──`);

  const catalog = await fetchStoreCatalogWithFallback(storeId, {
    apiKey,
    maxPagesPerSource: process.env.FETCH_MAX_PAGES ? Number(process.env.FETCH_MAX_PAGES) : undefined,
    allowFallback: true,
  });

  writeJson(join(CATALOG_DIR, `${storeId}.seed.json`), catalog);
  console.log(`  ✓ ${catalog.products.length} products (${catalog.meta.source})`);

  return {
    storeId,
    count: catalog.products.length,
    source: catalog.meta.source,
    error: catalog.meta.fetchError ?? null,
  };
}

async function main() {
  console.log('Supermarket Dash — fetch & update all store catalogs\n');

  ensureTemplateSeedsExist();

  const supermarkets = loadJson(SUPERMARKETS_PATH);
  const apiKey = process.env.PEPESTO_API_KEY?.trim();
  const onlyStore = process.env.UPDATE_STORE?.trim();
  const storeIds = onlyStore ? [onlyStore] : listStoreIds();

  if (onlyStore && !STORE_FETCH_CONFIG[onlyStore]) {
    throw new Error(`Unknown store: ${onlyStore}`);
  }

  mkdirSync(CATALOG_DIR, { recursive: true });

  const storeResults = {};
  let fetchErrors = 0;

  for (const storeId of storeIds) {
    try {
      const result = await updateStoreSeed(storeId, apiKey);
      storeResults[storeId] = result;
      if (result.error) {
        fetchErrors += 1;
      }
    } catch (error) {
      fetchErrors += 1;
      storeResults[storeId] = { storeId, count: null, source: 'failed', error: error.message };
      console.warn(`  ⚠ ${storeId}: ${error.message}`);
    }
  }

  const storeCatalogs = loadActiveCatalogs(CATALOG_DIR, SUPERMARKETS_PATH);
  const products = mergeStoreCatalogs(storeCatalogs);
  const summary = summarizeCatalogs(storeCatalogs, products);

  const liveFetchCount = Object.values(storeResults).filter((r) => r.source === 'live-fetch').length;
  const pepestoCount = Object.values(storeResults).filter((r) => r.source === 'pepesto' || r.fetchMethod === 'pepesto').length;

  const output = {
    meta: {
      lastUpdated: new Date().toISOString(),
      source: liveFetchCount > 0 ? 'live-fetch' : pepestoCount > 0 ? 'pepesto' : 'seed',
      storeCount: supermarkets.length,
      fetchErrors,
      storeResults,
      ...summary,
    },
    products,
  };

  writeJson(OUTPUT_PATH, output);
  writeJson(join(DATA_DIR, 'products.seed.json'), output);

  console.log('\nPer-store product counts:');
  for (const [storeId, count] of Object.entries(summary.storeProductCounts)) {
    const result = storeResults[storeId];
    console.log(`  ${storeId}: ${count} (${result?.source ?? 'unknown'})`);
  }

  console.log(`\n✓ Unified catalogue: ${products.length} products from ${summary.totalStoreEntries} store entries`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
