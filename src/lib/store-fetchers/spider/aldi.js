import { buildStoreCatalog } from '../common.js';
import {
  createSpiderThrottle,
  derefPayload,
  fetchHtml,
  parseNuxtPayload,
  priceFromMinor,
  resolveSpiderMaxTerms,
} from './common.js';
import { withPlaywrightSession } from './playwright-session.js';

const ORIGIN = 'https://www.aldi.co.uk';
const SEARCH_URL = 'https://api.aldi.co.uk/v3/product-search';
const PAGE_SIZE = 48;

const FOOD_CATEGORY_PATTERN =
  /food|dairy|drink|fresh|frozen|bakery|cupboard|grocery|chilled|meat|fish|fruit|veg|snack|breakfast|household|cleaning|baby|pet/i;

/**
 * @param {unknown} item
 */
function parseAldiProduct(item) {
  if (!item?.name || !item?.sku) {
    return null;
  }

  const standard = priceFromMinor(item.price?.amountRelevant ?? item.price?.amount);
  if (standard == null) {
    return null;
  }

  const categories = (item.categories ?? []).map((entry) => entry?.name ?? '').filter(Boolean);
  if (categories.length && !categories.some((name) => FOOD_CATEGORY_PATTERN.test(name))) {
    return null;
  }

  if (/specialbuys|clothing|toys|garden|electricals|sports and leisure|home/i.test(categories.join(' '))) {
    return null;
  }

  const brand = item.brandName ?? null;
  const ownLabel = /^(specially selected|everyday essentials|nature's pick|bramwells|cowbelle|empire|ashfield|st\.|Elevenses|Rooster)/i.test(
    brand ?? item.name,
  );

  return {
    sku: String(item.sku),
    name: item.name,
    brand: ownLabel ? 'Aldi' : brand,
    ownLabel,
    storeLabel: ownLabel ? 'Aldi' : null,
    category: categories[0] ?? 'Grocery',
    price: { standard, loyalty: null },
  };
}

/**
 * @param {number} maxPages
 * @param {(url: string, headers: Record<string, string>) => Promise<unknown>} fetchSearchJson
 * @param {import('../common.js').Throttle} throttle
 */
async function fetchCatalogPages(maxPages, fetchSearchJson, throttle) {
  /** @type {import('../common.js').RawStoreProduct[]} */
  const products = [];
  const seenSkus = new Set();

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * PAGE_SIZE;
    const url = `${SEARCH_URL}?query=food&limit=${PAGE_SIZE}&offset=${offset}`;
    await throttle.wait();

    const payload = await fetchSearchJson(url, {
      Referer: `${ORIGIN}/results?q=food`,
      Origin: ORIGIN,
    });

    const batch = payload?.data ?? [];
    if (!batch.length) {
      break;
    }

    for (const item of batch) {
      const parsed = parseAldiProduct(item);
      if (parsed && !seenSkus.has(parsed.sku)) {
        seenSkus.add(parsed.sku);
        products.push(parsed);
      }
    }

    const total = payload?.meta?.pagination?.totalCount ?? 0;
    console.log(`    page ${page + 1}: +${batch.length} (${products.length} food items total)`);

    if (offset + PAGE_SIZE >= total) {
      break;
    }
  }

  return products;
}

/**
 * @param {{ maxPagesPerSource?: number, throttleMs?: number }} [opts]
 */
export async function fetchAldiSpiderCatalog(opts = {}) {
  const maxPages = opts.maxPagesPerSource ?? Number(process.env.FETCH_MAX_PAGES ?? 80);
  const throttle = createSpiderThrottle(opts);

  console.log('  Aldi spider: paginating product-search API…');

  return withPlaywrightSession(ORIGIN, '/results?q=food', async (fetchSearchJson) => {
    const products = await fetchCatalogPages(maxPages, fetchSearchJson, throttle);

    if (!products.length) {
      throw new Error('Aldi spider returned no products');
    }

    return buildStoreCatalog('aldi', products, {
      fetchMethod: 'spider-aldi',
      pages: maxPages,
    });
  });
}
