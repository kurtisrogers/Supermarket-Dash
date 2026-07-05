import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Load one seed catalog per supermarket.
 * @param {string} catalogDir
 * @param {string} supermarketsPath
 */
export function loadActiveCatalogs(catalogDir, supermarketsPath) {
  const supermarkets = loadJson(supermarketsPath);

  return supermarkets.map((store) => {
    const storeId = store.id;
    const seedPath = join(catalogDir, `${storeId}.seed.json`);

    if (existsSync(seedPath)) {
      return loadJson(seedPath);
    }

    throw new Error(`Missing seed catalog for ${storeId} (expected ${seedPath})`);
  });
}
