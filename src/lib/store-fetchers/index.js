import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchPepestoStoreCatalog, PEPESTO_STORE_DOMAINS } from './pepesto.js';
import { fetchSainsburysCatalog } from './sainsburys.js';
import { fetchTescoCatalog } from './tesco.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(__dirname, '../../data/catalogs');

/** @type {Record<string, { label: string, domain?: string }>} */
export const STORE_FETCH_CONFIG = {
  tesco: { label: 'Tesco' },
  sainsburys: { label: "Sainsbury's" },
  asda: { label: 'Asda', domain: PEPESTO_STORE_DOMAINS.asda },
  morrisons: { label: 'Morrisons', domain: PEPESTO_STORE_DOMAINS.morrisons },
  waitrose: { label: 'Waitrose', domain: PEPESTO_STORE_DOMAINS.waitrose },
  aldi: { label: 'Aldi' },
  lidl: { label: 'Lidl' },
  ocado: { label: 'Ocado' },
};

function loadExistingCatalog(storeId) {
  const seedPath = join(CATALOG_DIR, `${storeId}.seed.json`);
  if (!existsSync(seedPath)) {
    return null;
  }
  return JSON.parse(readFileSync(seedPath, 'utf8'));
}

/**
 * Fetch full product catalog for one supermarket.
 * @param {string} storeId
 * @param {{ apiKey?: string, maxPagesPerSource?: number }} [opts]
 */
export async function fetchStoreCatalog(storeId, opts = {}) {
  const apiKey = opts.apiKey ?? process.env.PEPESTO_API_KEY?.trim();

  switch (storeId) {
    case 'tesco':
      return fetchTescoCatalog(opts);
    case 'sainsburys':
      return fetchSainsburysCatalog(opts);
    case 'asda':
    case 'morrisons':
    case 'waitrose': {
      if (!apiKey) {
        throw new Error(
          `${STORE_FETCH_CONFIG[storeId].label} requires PEPESTO_API_KEY (no public catalog API available)`,
        );
      }
      return fetchPepestoStoreCatalog(storeId, PEPESTO_STORE_DOMAINS[storeId], apiKey);
    }
    case 'aldi':
    case 'lidl':
    case 'ocado':
      throw new Error(
        `${STORE_FETCH_CONFIG[storeId].label} has no accessible public catalog API — add PEPESTO_API_KEY when supported, or import a catalog file manually`,
      );
    default:
      throw new Error(`Unknown store: ${storeId}`);
  }
}

/**
 * Fetch catalog, falling back to existing seed on failure for unsupported stores.
 * @param {string} storeId
 * @param {{ apiKey?: string, maxPagesPerSource?: number, allowFallback?: boolean }} [opts]
 */
export async function fetchStoreCatalogWithFallback(storeId, opts = {}) {
  try {
    return await fetchStoreCatalog(storeId, opts);
  } catch (error) {
    if (opts.allowFallback === false) {
      throw error;
    }

    const existing = loadExistingCatalog(storeId);
    if (existing?.products?.length) {
      console.warn(`  ⚠ ${storeId}: ${error.message}`);
      console.warn(`    Keeping existing seed catalog (${existing.products.length} products)`);
      return {
        ...existing,
        meta: {
          ...existing.meta,
          lastUpdated: new Date().toISOString(),
          source: 'seed-fallback',
          fetchError: error.message,
        },
      };
    }

    throw error;
  }
}

export function listStoreIds() {
  return Object.keys(STORE_FETCH_CONFIG);
}
