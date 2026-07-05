/**
 * Map Pepesto /catalog and /promotions responses to per-store catalog entries.
 * @see https://github.com/pepesto-solutions/pepesto-openapi-spec
 */

/** @type {Record<string, string[]>} */
export const storeOwnLabelPrefixes = {
  tesco: ['Tesco Finest', 'Tesco Organic', 'Tesco'],
  sainsburys: ["Sainsbury's SO Organic", "Sainsbury's Taste the Difference", "Sainsbury's"],
  asda: ['Asda Extra Special', 'Asda Organic', 'Asda'],
  morrisons: ['Morrisons The Best', 'Morrisons Savers', 'Morrisons'],
  waitrose: ['Waitrose Duchy Organic', 'Waitrose No.1', 'Waitrose Essential', 'Waitrose'],
  ocado: ['Ocado'],
  aldi: ['Aldi'],
  lidl: ['Lidl'],
};

/**
 * @param {number} minor
 * @param {string} currency
 */
export function priceFromMinor(minor, currency = 'GBP') {
  const value = Number(minor);
  if (!Number.isFinite(value)) {
    return null;
  }

  if (currency === 'GBP') {
    return Math.round(value) / 100;
  }

  return value / 100;
}

/**
 * @param {string} url
 * @param {string} storeId
 */
export function extractSkuFromUrl(url, storeId) {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments.at(-1) ?? '';
    const numeric = last.match(/\d{5,}/)?.[0];
    if (numeric) {
      return numeric;
    }

    const penultimate = segments.at(-2) ?? '';
    const altNumeric = penultimate.match(/\d{5,}/)?.[0];
    if (altNumeric) {
      return altNumeric;
    }

    return `${storeId}-${last}`.slice(0, 32);
  } catch {
    return `${storeId}-${url}`.slice(0, 32);
  }
}

/**
 * @param {string} displayName
 * @param {string} storeId
 */
export function inferBrand(displayName, storeId) {
  const prefixes = storeOwnLabelPrefixes[storeId] ?? [];
  for (const prefix of prefixes) {
    if (displayName.startsWith(prefix)) {
      return { brand: prefix, ownLabel: true, storeLabel: prefix };
    }
  }

  const firstToken = displayName.split(/\s+/)[0] ?? '';
  if (firstToken.length >= 2 && /^[A-Z]/.test(firstToken) && !/^\d/.test(firstToken)) {
    return { brand: firstToken.replace(/['']s$/i, ''), ownLabel: false, storeLabel: null };
  }

  return { brand: null, ownLabel: true, storeLabel: storeLabelsFallback(storeId) };
}

function storeLabelsFallback(storeId) {
  const labels = {
    tesco: 'Tesco',
    sainsburys: "Sainsbury's",
    asda: 'Asda',
    morrisons: 'Morrisons',
    waitrose: 'Waitrose',
    ocado: 'Ocado',
    aldi: 'Aldi',
    lidl: 'Lidl',
  };
  return labels[storeId] ?? storeId;
}

/**
 * @param {string} storeId
 * @param {string} url
 * @param {object} item
 * @param {number|null} promoPriceMinor
 */
export function mapPepestoProduct(storeId, url, item, promoPriceMinor = null) {
  const displayName = item.names?.en ?? Object.values(item.names ?? {})[0] ?? item.entity_name;
  if (!displayName) {
    return null;
  }

  const quantity = item.quantity_str ? ` ${item.quantity_str}` : '';
  const name = displayName.includes(item.quantity_str ?? '')
    ? displayName
    : `${displayName}${quantity}`.trim();

  const standard = priceFromMinor(item.price, item.currency);
  if (standard == null || standard <= 0) {
    return null;
  }

  const promoPrice = promoPriceMinor != null ? priceFromMinor(promoPriceMinor, item.currency) : null;
  const loyalty =
    promoPrice != null && promoPrice < standard
      ? promoPrice
      : item.promo === true && promoPrice != null && promoPrice < standard
        ? promoPrice
        : null;

  const { brand, ownLabel, storeLabel } = inferBrand(displayName, storeId);
  const sku = extractSkuFromUrl(url, storeId);
  const slug = `${storeId}-${sku}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  const searchTerms = [
    name.toLowerCase(),
    item.entity_name?.toLowerCase(),
    brand?.toLowerCase(),
    sku,
    ...(item.tags ?? []).map((tag) => tag.toLowerCase()),
  ].filter(Boolean);

  return {
    id: slug,
    productGroup: null,
    storeId,
    name,
    brand,
    storeLabel: ownLabel ? storeLabel : null,
    barcode: null,
    category: item.entity_name ?? 'Grocery',
    searchTerms: [...new Set(searchTerms)],
    ownLabel,
    sku,
    price: {
      standard,
      loyalty,
    },
  };
}

/**
 * @param {string} storeId
 * @param {Record<string, object>} catalogProducts
 * @param {Record<string, object>} [promoProducts]
 */
export function mapPepestoCatalog(storeId, catalogProducts, promoProducts = {}) {
  const products = [];

  for (const [url, item] of Object.entries(catalogProducts ?? {})) {
    const promoItem = promoProducts[url];
    const promoPriceMinor = promoItem?.price ?? null;
    const mapped = mapPepestoProduct(storeId, url, item, promoPriceMinor);
    if (mapped) {
      products.push(mapped);
    }
  }

  products.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

  return products;
}
