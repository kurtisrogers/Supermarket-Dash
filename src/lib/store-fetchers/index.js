import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchPepestoStoreCatalog, PEPESTO_STORE_DOMAINS } from './pepesto.js';
import { fetchSainsburysCatalog } from './sainsburys.js';
import { fetchTescoCatalog } from './tesco.js';
import {
  fetchAldiSpiderCatalog,
  fetchAsdaSpiderCatalog,
  fetchLidlSpiderCatalog,
  fetchMorrisonsSpiderCatalog,
  fetchOcadoSpiderCatalog,
  fetchWaitroseSpiderCatalog,
} from './spider/index.js';

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
 * @param {{ apiKey?: string, maxPagesPerSource?: number, maxTerms?: number, throttleMs?: number }} [opts]
 */
export async function fetchStoreCatalog(storeId, opts = {}) {
  const apiKey = opts.apiKey ?? process.env.PEPESTO_API_KEY?.trim();
  const usePepesto = process.env.USE_PEPESTO?.trim() === '1';

  switch (storeId) {
    case 'tesco':
      return fetchTescoCatalog(opts);
    case 'sainsburys':
      return fetchSainsburysCatalog(opts);
    case 'asda':
      if (usePepesto && apiKey) {
        return fetchPepestoStoreCatalog(storeId, PEPESTO_STORE_DOMAINS.asda, apiKey);
      }
      return fetchAsdaSpiderCatalog(opts);
    case 'morrisons':
      if (usePepesto && apiKey) {
        return fetchPepestoStoreCatalog(storeId, PEPESTO_STORE_DOMAINS.morrisons, apiKey);
      }
      return fetchMorrisonsSpiderCatalog(opts);
    case 'waitrose':
      if (usePepesto && apiKey) {
        return fetchPepestoStoreCatalog(storeId, PEPESTO_STORE_DOMAINS.waitrose, apiKey);
      }
      return fetchWaitroseSpiderCatalog(opts);
    case 'aldi':
      return fetchAldiSpiderCatalog(opts);
    case 'lidl':
      return fetchLidlSpiderCatalog(opts);
    case 'ocado':
      return fetchOcadoSpiderCatalog(opts);
    default:
      throw new Error(`Unknown store: ${storeId}`);
  }
}

/**
 * Fetch catalog, falling back to existing seed on failure for unsupported stores.
 * @param {string} storeId
 * @param {{ apiKey?: string, maxPagesPerSource?: number, maxTerms?: number, allowFallback?: boolean, throttleMs?: number }} [opts]
 */
export async function fetchStoreCatalogWithFallback(storeId, opts = {}) {
  try {
    const catalog = await fetchStoreCatalog(storeId, opts);

    if (!catalog.products?.length) {
      throw new Error(`${STORE_FETCH_CONFIG[storeId].label} spider returned no products`);
    }

    return catalog;
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
