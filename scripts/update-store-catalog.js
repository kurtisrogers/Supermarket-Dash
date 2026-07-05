/**
 * Fetch and update one supermarket's seed catalog file.
 * Usage: node scripts/update-store-catalog.js tesco
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchStoreCatalogWithFallback, listStoreIds, STORE_FETCH_CONFIG } from '../src/lib/store-fetchers/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CATALOG_DIR = join(ROOT, 'src/data/catalogs');

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  const storeId = process.argv[2]?.trim();

  if (!storeId) {
    console.error('Usage: node scripts/update-store-catalog.js <store-id>');
    console.error(`Store IDs: ${listStoreIds().join(', ')}`);
    process.exit(1);
  }

  if (!STORE_FETCH_CONFIG[storeId]) {
    console.error(`Unknown store: ${storeId}`);
    process.exit(1);
  }

  mkdirSync(CATALOG_DIR, { recursive: true });

  const label = STORE_FETCH_CONFIG[storeId].label;
  console.log(`\nFetching ${label} (${storeId}) catalog…\n`);

  const catalog = await fetchStoreCatalogWithFallback(storeId, {
    apiKey: process.env.PEPESTO_API_KEY?.trim(),
    maxPagesPerSource: process.env.FETCH_MAX_PAGES ? Number(process.env.FETCH_MAX_PAGES) : undefined,
    allowFallback: process.env.FETCH_STRICT !== '1',
  });

  const outputPath = join(CATALOG_DIR, `${storeId}.seed.json`);
  writeJson(outputPath, catalog);

  console.log(`\n✓ ${storeId}: ${catalog.products.length} products → ${outputPath}`);
  console.log(`  Source: ${catalog.meta.source}${catalog.meta.fetchError ? ` (${catalog.meta.fetchError})` : ''}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
