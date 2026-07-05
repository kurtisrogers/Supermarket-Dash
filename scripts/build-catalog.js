/**
 * Build unified comparison catalogue from per-supermarket catalog seeds.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { mergeStoreCatalogs, summarizeCatalogs } from '../src/lib/catalog-merge.js';
import { loadActiveCatalogs, loadJson } from '../src/lib/catalog-load.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src/data');
const CATALOG_DIR = join(DATA_DIR, 'catalogs');
const SEED_PATH = join(DATA_DIR, 'products.seed.json');
const OUTPUT_PATH = join(DATA_DIR, 'products.json');
const SUPERMARKETS_PATH = join(DATA_DIR, 'supermarkets.json');

function main() {
  console.log('Building unified catalogue from per-supermarket catalogs…\n');

  if (!existsSync(CATALOG_DIR)) {
    mkdirSync(CATALOG_DIR, { recursive: true });
    spawnSync('node', ['scripts/generate-store-seeds.js'], { cwd: ROOT, stdio: 'inherit' });
  }

  const storeCatalogs = loadActiveCatalogs(CATALOG_DIR, SUPERMARKETS_PATH);
  const supermarkets = loadJson(SUPERMARKETS_PATH);
  const mergedProducts = mergeStoreCatalogs(storeCatalogs);
  const summary = summarizeCatalogs(storeCatalogs, mergedProducts);

  const hasLiveCatalogs = storeCatalogs.some((catalog) => catalog.meta?.source === 'pepesto');

  const meta = {
    lastUpdated: new Date().toISOString(),
    source: hasLiveCatalogs ? 'pepesto-merge' : 'catalog-merge',
    storeCount: supermarkets.length,
    ...summary,
  };

  const payload = { meta, products: mergedProducts };

  writeFileSync(SEED_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);

  console.log('Per-store product counts:');
  for (const [storeId, count] of Object.entries(summary.storeProductCounts)) {
    const catalog = storeCatalogs.find((entry) => entry.meta.storeId === storeId);
    const label = catalog?.meta?.source === 'pepesto' ? 'Pepesto live' : 'seed';
    console.log(`  ${storeId}: ${count} (${label})`);
  }
  console.log(`\n✓ ${summary.totalStoreEntries} store entries → ${summary.unifiedProductCount} unified products`);
  console.log(`  Branded: ${summary.brandedCount} | Own-label: ${summary.ownLabelCount}`);
}

main();
