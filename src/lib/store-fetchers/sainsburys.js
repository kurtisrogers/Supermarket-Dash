import { buildStoreCatalog, Throttle } from './common.js';
import { allDiscoveryTerms } from './search-terms.js';

const API_BASE = 'https://www.sainsburys.co.uk/groceries-api/gol-services/product/v1/product';
const CATEGORY_TREE = 'https://www.sainsburys.co.uk/groceries-api/gol-services/product/categories/tree';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

function parseProduct(item) {
  const standard = Number(item.retail_price?.price);
  if (!Number.isFinite(standard) || standard <= 0) {
    return null;
  }

  const promo = item.promotions?.[0];
  const promoPrice = Number(promo?.promo_price ?? promo?.retail_price?.price);
  const loyalty = Number.isFinite(promoPrice) && promoPrice < standard ? promoPrice : null;
  const name = item.name ?? '';
  const brand = item.attributes?.brand?.[0] ?? null;
  const ownLabel = /sainsbury/i.test(name) || brand?.toLowerCase().includes('sainsbury');

  return {
    sku: String(item.product_uid ?? item.sainId ?? ''),
    name,
    brand: ownLabel ? "Sainsbury's" : brand,
    ownLabel,
    storeLabel: ownLabel ? "Sainsbury's" : null,
    barcode: item.eans?.[0]?.replace(/^0+/, '') ?? null,
    category: item.categories?.[0]?.name ?? 'Grocery',
    price: { standard, loyalty },
    url: item.full_url ?? null,
  };
}

async function sainsburysGet(throttle, url, referer) {
  await throttle.wait();
  const res = await fetch(url, {
    headers: { ...HEADERS, Referer: referer },
  });

  if (res.status === 403) {
    throw new Error("Sainsbury's API blocked request (403) — retry later or run from CI");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sainsbury's API error (${res.status}): ${text.slice(0, 120)}`);
  }

  return res.json();
}

async function fetchSearchPages(throttle, term, maxPages, products) {
  let page = 1;

  while (page <= maxPages) {
    const url = `${API_BASE}?filter%5Bkeyword%5D=${encodeURIComponent(term)}&page_number=${page}&page_size=24&sort_order=FAVOURITES_FIRST`;
    const referer = `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(term)}`;
    const data = await sainsburysGet(throttle, url, referer);
    const batch = data.products ?? [];
    if (!batch.length) {
      break;
    }

    for (const item of batch) {
      const parsed = parseProduct(item);
      if (parsed) {
        products.push(parsed);
      }
    }

    const totalPages = Math.ceil((data.total_record_count ?? 0) / 24);
    if (page >= totalPages || batch.length < 24) {
      break;
    }
    page += 1;
  }
}

function collectCategorySlugs(node, out) {
  const children = node.c ?? [];
  if (!children.length && node.s?.startsWith('gb/groceries/')) {
    out.push(node.s);
    return;
  }
  for (const child of children) {
    collectCategorySlugs(child, out);
  }
}

async function fetchCategoryPages(throttle, slug, maxPages, products) {
  let page = 1;

  while (page <= maxPages) {
    const url = `${API_BASE}?filter%5Bcategory_seo_url%5D=${encodeURIComponent(slug)}&page_number=${page}&page_size=24&sort_order=FAVOURITES_FIRST`;
    const referer = `https://www.sainsburys.co.uk/gol-ui/browse/${slug}`;
    try {
      const data = await sainsburysGet(throttle, url, referer);
      const batch = data.products ?? [];
      if (!batch.length) {
        break;
      }

      for (const item of batch) {
        const parsed = parseProduct(item);
        if (parsed) {
          products.push(parsed);
        }
      }

      if (batch.length < 24) {
        break;
      }
      page += 1;
    } catch (error) {
      if (String(error.message).includes('400') || String(error.message).includes('500')) {
        break;
      }
      throw error;
    }
  }
}

/**
 * @param {{ maxPagesPerSource?: number, throttleMs?: number }} [opts]
 */
export async function fetchSainsburysCatalog(opts = {}) {
  const maxPages = opts.maxPagesPerSource ?? Number(process.env.FETCH_MAX_PAGES ?? 80);
  const throttle = new Throttle(opts.throttleMs ?? 1200);
  const products = [];

  console.log("  Sainsbury's: loading category tree…");
  const tree = await sainsburysGet(
    throttle,
    CATEGORY_TREE,
    'https://www.sainsburys.co.uk/gol-ui/groceries',
  );
  const slugs = [];
  collectCategorySlugs(tree.category_hierarchy, slugs);
  console.log(`  Sainsbury's: browsing ${slugs.length} categories…`);

  for (const slug of slugs) {
    const before = products.length;
    try {
      await fetchCategoryPages(throttle, slug, maxPages, products);
      const added = products.length - before;
      if (added > 0) {
        console.log(`    ${slug.split('/').pop()}: +${added}`);
      }
    } catch (error) {
      console.warn(`    ⚠ skip ${slug.split('/').pop()}: ${error.message}`);
    }
  }

  const terms = allDiscoveryTerms();
  console.log(`  Sainsbury's: searching ${terms.length} discovery terms…`);
  for (const term of terms) {
    const before = products.length;
    try {
      await fetchSearchPages(throttle, term, maxPages, products);
      const added = products.length - before;
      if (added > 0) {
        console.log(`    "${term}": +${added}`);
      }
    } catch (error) {
      console.warn(`    ⚠ search "${term}": ${error.message}`);
    }
  }

  return buildStoreCatalog('sainsburys', products, {
    fetchMethod: 'sainsburys-gol-api',
    categories: slugs.length,
    searchTerms: terms.length,
  });
}
