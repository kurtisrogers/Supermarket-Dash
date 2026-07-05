import { writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { mergeStoreCatalogs, summarizeCatalogs } from '../src/lib/catalog-merge.js';
import { loadActiveCatalogs, loadJson } from '../src/lib/catalog-load.js';
import { mapPepestoCatalog } from '../src/lib/pepesto-catalog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src/data');
const CATALOG_DIR = join(DATA_DIR, 'catalogs');
const OUTPUT_PATH = join(DATA_DIR, 'products.json');
const SUPERMARKETS_PATH = join(DATA_DIR, 'supermarkets.json');

/** Pepesto-supported UK online grocers — full catalog via /catalog (~1,000–2,000 SKUs each). */
const PEPESTO_DOMAINS = {
  tesco: 'tesco.com',
  sainsburys: 'sainsburys.co.uk',
  asda: 'asda.com',
  morrisons: 'groceries.morrisons.com',
  waitrose: 'waitrose.com',
};

const PEPESTO_API = 'https://api.pepesto.com/api';

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function ensureStoreSeedsExist() {
  if (!existsSync(CATALOG_DIR) || !readdirSync(CATALOG_DIR).some((file) => file.endsWith('.seed.json'))) {
    console.log('Generating per-supermarket seed catalogs…');
    spawnSync('node', ['scripts/generate-store-seeds.js'], { cwd: ROOT, stdio: 'inherit' });
  }
}

async function pepestoPost(apiKey, endpoint, body) {
  const response = await fetch(`${PEPESTO_API}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Pepesto ${endpoint} error (${response.status}) for ${body.supermarket_domain}${detail ? `: ${detail.slice(0, 120)}` : ''}`);
  }

  return response.json();
}

async function fetchPepestoStoreCatalog(apiKey, storeId, domain) {
  const [catalogPayload, promoPayload] = await Promise.all([
    pepestoPost(apiKey, 'catalog', { supermarket_domain: domain }),
    pepestoPost(apiKey, 'promotions', { supermarket_domain: domain }).catch(() => ({ parsed_products: {} })),
  ]);

  const catalogProducts = catalogPayload?.parsed_products ?? {};
  const promoProducts = promoPayload?.parsed_products ?? {};

  if (!catalogProducts || typeof catalogProducts !== 'object') {
    throw new Error(`Unexpected Pepesto catalog response for ${domain}`);
  }

  const products = mapPepestoCatalog(storeId, catalogProducts, promoProducts);

  return {
    meta: {
      storeId,
      source: 'pepesto',
      domain,
      lastUpdated: new Date().toISOString(),
      productCount: products.length,
      catalogSkus: Object.keys(catalogProducts).length,
      promoSkus: Object.keys(promoProducts).length,
    },
    products,
  };
}

async function updateStoreCatalogsFromPepesto(apiKey) {
  let apiHits = 0;
  let apiMisses = 0;
  const storeResults = {};

  for (const [storeId, domain] of Object.entries(PEPESTO_DOMAINS)) {
    try {
      console.log(`  Fetching full ${storeId} catalog from Pepesto (${domain})…`);
      const catalog = await fetchPepestoStoreCatalog(apiKey, storeId, domain);
      writeJson(join(CATALOG_DIR, `${storeId}.json`), catalog);
      console.log(`    ✓ ${catalog.products.length} products (${catalog.meta.promoSkus} on promotion)`);
      apiHits += catalog.products.length;
      storeResults[storeId] = catalog.products.length;
    } catch (error) {
      console.warn(`    ⚠ ${storeId}: ${error.message}`);
      apiMisses += 1;
      storeResults[storeId] = null;
    }
  }

  return { apiHits, apiMisses, storeResults };
}

async function main() {
  console.log('Supermarket Dash — price & catalog update\n');

  ensureStoreSeedsExist();

  const supermarkets = loadJson(SUPERMARKETS_PATH);
  const apiKey = process.env.PEPESTO_API_KEY?.trim();

  let source = 'seed';
  let apiHits = 0;
  let apiMisses = 0;
  let pepestoStoreResults = {};

  if (apiKey) {
    console.log('PEPESTO_API_KEY found — fetching full catalogs for Pepesto-supported supermarkets…');
    console.log('  (Tesco, Sainsbury\'s, Asda, Morrisons, Waitrose — ~1,000–2,000 products each)\n');
    const result = await updateStoreCatalogsFromPepesto(apiKey);
    apiHits = result.apiHits;
    apiMisses = result.apiMisses;
    pepestoStoreResults = result.storeResults;
    source = apiMisses === Object.keys(PEPESTO_DOMAINS).length ? 'seed' : 'pepesto';
  } else {
    console.log('No PEPESTO_API_KEY — using per-supermarket seed catalogs (~50 products each).');
    console.log('  Add PEPESTO_API_KEY to GitHub Secrets to import ALL indexed products from each online supermarket.');
    console.log('  Aldi, Lidl and Ocado remain on seed data (not available via Pepesto).\n');
  }

  const storeCatalogs = loadActiveCatalogs(CATALOG_DIR, SUPERMARKETS_PATH);
  const products = mergeStoreCatalogs(storeCatalogs);
  const summary = summarizeCatalogs(storeCatalogs, products);

  const output = {
    meta: {
      lastUpdated: new Date().toISOString(),
      source,
      storeCount: supermarkets.length,
      apiHits,
      apiMisses,
      pepestoStores: Object.keys(PEPESTO_DOMAINS),
      pepestoStoreResults,
      seedOnlyStores: supermarkets
        .map((store) => store.id)
        .filter((id) => !pepestoStoreResults[id] && !existsSync(join(CATALOG_DIR, `${id}.json`))),
      ...summary,
    },
    products,
  };

  writeJson(OUTPUT_PATH, output);
  writeJson(join(DATA_DIR, 'products.seed.json'), output);

  console.log('Per-store product counts:');
  for (const [storeId, count] of Object.entries(summary.storeProductCounts)) {
    const live = existsSync(join(CATALOG_DIR, `${storeId}.json`));
    console.log(`  ${storeId}: ${count}${live ? ' (Pepesto live)' : ' (seed)'}`);
  }

  console.log(`\n✓ Unified catalogue: ${products.length} products from ${summary.totalStoreEntries} store entries`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
