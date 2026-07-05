import { buildStoreCatalog } from '../common.js';
import { spiderDiscoveryTerms } from '../search-terms.js';
import { createSpiderThrottle, limitDiscoveryTerms, priceFromAmountString, resolveSpiderMaxTerms } from './common.js';
import { withPlaywrightSession } from './playwright-session.js';

const ORIGIN = 'https://www.waitrose.com';
const PAGE_SIZE = 48;

/**
 * @param {Record<string, unknown>} entity
 */
function parseWaitroseEntity(entity) {
  if (!entity?.name || !entity?.lineNumber) {
    return null;
  }

  const standard = priceFromAmountString(entity.currentSaleUnitPrice?.price?.amount);
  if (standard == null) {
    return null;
  }

  const promo = priceFromAmountString(entity.promotions?.[0]?.promoPrice?.amount);
  const loyalty = promo != null && promo < standard ? promo : null;
  const brand = entity.brand ?? null;
  const ownLabel = /waitrose|essential/i.test(entity.name) || /waitrose/i.test(String(brand ?? ''));

  return {
    sku: String(entity.lineNumber),
    name: entity.name,
    brand: ownLabel ? 'Waitrose' : brand,
    ownLabel,
    storeLabel: ownLabel ? 'Waitrose' : null,
    category: entity.categories?.[0]?.name ?? 'Grocery',
    price: { standard, loyalty },
  };
}

/**
 * @param {string} term
 * @param {number} maxPages
 * @param {import('playwright').Page} page
 * @param {import('../common.js').Throttle} throttle
 */
async function fetchSearchTerm(term, maxPages, page, throttle) {
  /** @type {import('../common.js').RawStoreProduct[]} */
  const products = [];

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const start = pageIndex * PAGE_SIZE;
    const url = `${ORIGIN}/ecom/shop/search?searchTerm=${encodeURIComponent(term)}&start=${start}`;

    await throttle.wait();
    const state = await page.evaluate(async (searchUrl) => {
      const response = await fetch(searchUrl, {
        headers: { Accept: 'text/html' },
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error(`Waitrose search page failed (${response.status})`);
      }

      const html = await response.text();
      const match = html.match(/__PRELOADED_STATE__\s*=\s*JSON\.parse\('([\s\S]*?)'\);/);
      if (!match) {
        throw new Error('Waitrose preloaded state missing from search page');
      }

      const jsonText = match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      return JSON.parse(jsonText);
    }, url);

    const refs = state.searchAndBrowse?.products ?? [];
    const entities = state.entities?.products ?? {};

    if (!refs.length) {
      break;
    }

    for (const ref of refs) {
      const entity = entities[ref.searchProduct];
      const parsed = parseWaitroseEntity(entity);
      if (parsed) {
        products.push(parsed);
      }
    }

    if (!state.searchAndBrowse?.hasMore) {
      break;
    }
  }

  return products;
}

/**
 * @param {{ maxPagesPerSource?: number, throttleMs?: number, maxTerms?: number }} [opts]
 */
export async function fetchWaitroseSpiderCatalog(opts = {}) {
  const maxPages = opts.maxPagesPerSource ?? Number(process.env.FETCH_MAX_PAGES ?? 80);
  const throttle = createSpiderThrottle({ ...opts, throttleMs: opts.throttleMs ?? 1400 });
  const terms = limitDiscoveryTerms(spiderDiscoveryTerms(), resolveSpiderMaxTerms(opts.maxTerms));

  console.log(`  Waitrose spider: searching ${terms.length} discovery terms…`);

  return withPlaywrightSession(ORIGIN, '/ecom/shop/browse/groceries', async (_fetchSearchJson, page) => {
    /** @type {import('../common.js').RawStoreProduct[]} */
    const products = [];

    for (const term of terms) {
      try {
        const before = products.length;
        const batch = await fetchSearchTerm(term, maxPages, page, throttle);
        products.push(...batch);
        const added = products.length - before;
        if (added > 0) {
          console.log(`    "${term}": +${added}`);
        }
      } catch (error) {
        console.warn(`    ⚠ Waitrose "${term}": ${error.message}`);
      }
    }

    if (!products.length) {
      throw new Error('Waitrose spider returned no products');
    }

    return buildStoreCatalog('waitrose', products, {
      fetchMethod: 'spider-waitrose',
      searchTerms: terms.length,
    });
  });
}
