import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Load one catalog per supermarket — prefer live Pepesto dump over seed file.
 * @param {string} catalogDir
 * @param {string} supermarketsPath
 */
export function loadActiveCatalogs(catalogDir, supermarketsPath) {
  const supermarkets = loadJson(supermarketsPath);

  return supermarkets.map((store) => {
    const storeId = store.id;
    const livePath = join(catalogDir, `${storeId}.json`);
    const seedPath = join(catalogDir, `${storeId}.seed.json`);

    if (existsSync(livePath)) {
      return loadJson(livePath);
    }
    if (existsSync(seedPath)) {
      return loadJson(seedPath);
    }

    throw new Error(`Missing catalog for ${storeId} (expected ${livePath} or ${seedPath})`);
  });
}

/**
 * List store IDs that have a live (non-seed) catalog on disk.
 * @param {string} catalogDir
 */
export function listLiveCatalogStores(catalogDir) {
  if (!existsSync(catalogDir)) {
    return [];
  }

  return readdirSync(catalogDir)
    .filter((file) => file.endsWith('.json') && !file.endsWith('.seed.json'))
    .map((file) => file.replace(/\.json$/, ''));
}
