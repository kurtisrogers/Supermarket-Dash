import { buildStoreCatalog } from '../common.js';
import { spiderDiscoveryTerms } from '../search-terms.js';
import {
  createSpiderThrottle,
  derefPayload,
  fetchHtml,
  limitDiscoveryTerms,
  parseNuxtPayload,
  priceFromAmountString,
  resolveSpiderMaxTerms,
} from './common.js';

const ORIGIN = 'https://www.lidl.co.uk';

/**
 * @param {unknown} item
 */
function parseLidlGridboxItem(item) {
  const data = item?.gridbox?.data ?? item?.xPayload?.gridbox?.data ?? item;
  if (!data?.fullTitle || !data?.erpNumber) {
    return null;
  }

  const standard = priceFromAmountString(data.price?.price ?? data.price?.amount);
  if (standard == null) {
    return null;
  }

  const oldPrice = priceFromAmountString(data.price?.oldPrice);
  const loyalty = oldPrice != null && oldPrice > standard ? standard : null;
  const brandName =
    typeof data.brand === 'object' && data.brand !== null
      ? data.brand.name ?? null
      : typeof data.brand === 'string'
        ? data.brand
        : null;
  const ownLabel = /^(milbona|baresa|deluxe|woodcote|orchard|simply|lidl)/i.test(brandName ?? data.fullTitle);

  return {
    sku: String(data.erpNumber),
    name: data.fullTitle,
    brand: ownLabel ? 'Lidl' : brandName,
    ownLabel,
    storeLabel: ownLabel ? 'Lidl' : null,
    category: data.category ?? 'Grocery',
    price: { standard, loyalty },
  };
}

/**
 * @param {unknown[]} payload
 */
function parseLidlSearchPayload(payload) {
  /** @type {import('../common.js').RawStoreProduct[]} */
  const products = [];

  for (let i = 0; i < payload.length; i += 1) {
    const entry = payload[i];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    if (!('items' in entry) || !('q' in entry)) {
      continue;
    }

    const root = derefPayload(payload, i);
    for (const item of root.items ?? []) {
      const parsed = parseLidlGridboxItem(item);
      if (parsed) {
        products.push(parsed);
      }
    }
  }

  return products;
}

/**
 * @param {string} term
 * @param {number} maxPages
 * @param {import('../common.js').Throttle} throttle
 */
async function fetchSearchTerm(term, maxPages, throttle) {
  /** @type {import('../common.js').RawStoreProduct[]} */
  const products = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * 48;
    const url = `${ORIGIN}/q/search?q=${encodeURIComponent(term)}${offset ? `&offset=${offset}` : ''}`;
    await throttle.wait();
    const html = await fetchHtml(url, { Referer: `${ORIGIN}/` });
    const payload = parseNuxtPayload(html);
    if (!payload) {
      break;
    }

    const batch = parseLidlSearchPayload(payload);
    if (!batch.length) {
      break;
    }

    products.push(...batch);

    let numFound = 0;
    for (let i = 0; i < payload.length; i += 1) {
      const entry = payload[i];
      if (entry && typeof entry === 'object' && !Array.isArray(entry) && 'numFound' in entry) {
        numFound = Number(derefPayload(payload, i).numFound ?? 0);
        break;
      }
    }

    if (!numFound || offset + 48 >= numFound) {
      break;
    }
  }

  return products;
}

/**
 * @param {{ maxPagesPerSource?: number, throttleMs?: number, maxTerms?: number }} [opts]
 */
export async function fetchLidlSpiderCatalog(opts = {}) {
  const maxPages = opts.maxPagesPerSource ?? Number(process.env.FETCH_MAX_PAGES ?? 80);
  const throttle = createSpiderThrottle(opts);
  const products = [];
  const terms = limitDiscoveryTerms(spiderDiscoveryTerms(), resolveSpiderMaxTerms(opts.maxTerms));

  console.log(`  Lidl spider: searching ${terms.length} discovery terms…`);

  for (const term of terms) {
    try {
      const before = products.length;
      const batch = await fetchSearchTerm(term, maxPages, throttle);
      products.push(...batch);
      const added = products.length - before;
      if (added > 0) {
        console.log(`    "${term}": +${added}`);
      }
    } catch (error) {
      console.warn(`    ⚠ Lidl "${term}": ${error.message}`);
    }
  }

  if (!products.length) {
    throw new Error('Lidl spider returned no products');
  }

  return buildStoreCatalog('lidl', products, {
    fetchMethod: 'spider-lidl',
    searchTerms: terms.length,
  });
}
