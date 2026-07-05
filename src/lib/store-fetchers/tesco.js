import { buildStoreCatalog, categoryFacet, Throttle } from './common.js';
import { allDiscoveryTerms, TESCO_DEPARTMENTS } from './search-terms.js';

const API_KEY = process.env.TESCO_API_KEY ?? 'TvOSZJHlEk0pjniDGQFAc9Q59WGAR4dA';
const ENDPOINT = 'https://xapi.tesco.com/';

const SEARCH_QUERY = `query Search($query: String!, $page: Int = 1, $count: Int) {
  search(query: $query, page: $page, count: $count) {
    results {
      node {
        __typename
        ... on ProductInterface {
          tpnc tpnb title brandName
          sellers { results { price { actual } promotions { price { afterDiscount } } } }
        }
      }
    }
  }
}`;

const CATEGORY_QUERY = `query GetCategoryProducts($facet: ID, $page: Int = 1, $count: Int) {
  category(facet: $facet, page: $page, count: $count) {
    results {
      node {
        __typename
        ... on ProductInterface {
          tpnc tpnb title brandName
          sellers { results { price { actual } promotions { price { afterDiscount } } } }
        }
      }
    }
  }
}`;

function parseNode(node) {
  if (!node?.tpnc || !node.title) {
    return null;
  }

  const seller = node.sellers?.results?.[0];
  const standard = Number(seller?.price?.actual);
  if (!Number.isFinite(standard) || standard <= 0) {
    return null;
  }

  const promo = Number(seller?.promotions?.[0]?.price?.afterDiscount);
  const loyalty = Number.isFinite(promo) && promo < standard ? promo : null;
  const brand = node.brandName ?? null;
  const ownLabel = brand?.toUpperCase() === 'TESCO';

  return {
    sku: node.tpnc,
    name: node.title,
    brand: ownLabel ? 'Tesco' : brand,
    ownLabel,
    storeLabel: ownLabel ? 'Tesco' : null,
    category: 'Grocery',
    price: { standard, loyalty },
  };
}

async function tescoRequest(throttle, operationName, query, variables) {
  await throttle.wait();
  const body = [{ operationName, variables, extensions: { mfeName: 'mfe-plp' }, query }];
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-apikey': API_KEY,
      language: 'en-GB',
      region: 'UK',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 403) {
    throw new Error('Tesco API rejected request (403) — set TESCO_API_KEY if the public key rotated');
  }

  const json = await res.json();
  const first = Array.isArray(json) ? json[0] : json;
  if (first?.errors?.length) {
    throw new Error(`Tesco GraphQL error: ${first.errors[0]?.message ?? 'unknown'}`);
  }

  return first?.data ?? {};
}

async function fetchCategoryPages(throttle, department, maxPages, products) {
  const facet = categoryFacet(department);
  let page = 1;

  while (page <= maxPages) {
    const data = await tescoRequest(throttle, 'GetCategoryProducts', CATEGORY_QUERY, {
      facet,
      page,
      count: 24,
    });
    const results = data.category?.results ?? [];
    if (!results.length) {
      break;
    }

    for (const entry of results) {
      const parsed = parseNode(entry.node);
      if (parsed) {
        products.push(parsed);
      }
    }

    if (results.length < 24) {
      break;
    }
    page += 1;
  }
}

async function fetchSearchPages(throttle, term, maxPages, products) {
  let page = 1;

  while (page <= maxPages) {
    const data = await tescoRequest(throttle, 'Search', SEARCH_QUERY, {
      query: term,
      page,
      count: 24,
    });
    const results = data.search?.results ?? [];
    if (!results.length) {
      break;
    }

    for (const entry of results) {
      const parsed = parseNode(entry.node);
      if (parsed) {
        products.push(parsed);
      }
    }

    if (results.length < 24) {
      break;
    }
    page += 1;
  }
}

/**
 * Fetch Tesco grocery catalog via category browse and keyword search.
 * @param {{ maxPagesPerSource?: number, throttleMs?: number }} [opts]
 */
export async function fetchTescoCatalog(opts = {}) {
  const maxPages = opts.maxPagesPerSource ?? Number(process.env.FETCH_MAX_PAGES ?? 80);
  const throttle = new Throttle(opts.throttleMs ?? 1100);
  const products = [];

  console.log(`  Tesco: browsing ${TESCO_DEPARTMENTS.length} departments (up to ${maxPages} pages each)…`);
  for (const department of TESCO_DEPARTMENTS) {
    const before = products.length;
    await fetchCategoryPages(throttle, department, maxPages, products);
    console.log(`    ${department}: +${products.length - before} (total ${products.length})`);
  }

  const terms = allDiscoveryTerms();
  console.log(`  Tesco: searching ${terms.length} discovery terms…`);
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

  return buildStoreCatalog('tesco', products, {
    fetchMethod: 'tesco-graphql',
    departments: TESCO_DEPARTMENTS.length,
    searchTerms: terms.length,
  });
}
