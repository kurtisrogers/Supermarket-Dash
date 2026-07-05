import { priceFromAmountString } from './common.js';

/**
 * @param {unknown} decorated
 */
export function parseOcadoPlatformProduct(decorated) {
  const product = decorated?.product ?? decorated;
  if (!product?.name || !product?.retailerProductId) {
    return null;
  }

  const standard = priceFromAmountString(
    product.price?.current?.amount ?? product.price?.amount ?? product.retailPrice?.amount,
  );
  if (standard == null) {
    return null;
  }

  const promo = priceFromAmountString(
    product.offer?.price?.current?.amount ??
      product.offer?.retailPrice?.amount ??
      product.promotion?.price?.amount,
  );
  const loyalty = promo != null && promo < standard ? promo : null;
  const brand = product.brand ?? null;

  return {
    sku: String(product.retailerProductId),
    name: product.name,
    brand,
    ownLabel: false,
    storeLabel: null,
    category: product.categoryPath?.[0] ?? 'Grocery',
    price: { standard, loyalty },
    brandHint: brand,
    nameHint: product.name,
  };
}

/**
 * @param {ReturnType<typeof parseOcadoPlatformProduct>} parsed
 * @param {string} storeId
 */
export function finalizeStoreProduct(parsed, storeId) {
  if (!parsed) {
    return null;
  }

  const labels = {
    morrisons: 'Morrisons',
    ocado: 'Ocado',
    asda: 'Asda',
  };
  const label = labels[storeId] ?? null;
  const ownLabel =
    storeId === 'morrisons'
      ? /morrisons/i.test(parsed.nameHint ?? '') || /morrisons/i.test(parsed.brandHint ?? '')
      : storeId === 'asda'
        ? /asda/i.test(parsed.nameHint ?? '') || /asda/i.test(parsed.brandHint ?? '')
        : /ocado|m&s|ms /i.test(parsed.nameHint ?? '');

  return {
    sku: parsed.sku,
    name: parsed.name,
    brand: ownLabel ? label : parsed.brandHint,
    ownLabel,
    storeLabel: ownLabel ? label : null,
    category: parsed.category,
    price: parsed.price,
  };
}

/**
 * @param {unknown} payload
 * @param {string} storeId
 */
export function collectOcadoPlatformProducts(payload, storeId) {
  /** @type {import('../common.js').RawStoreProduct[]} */
  const products = [];

  for (const group of payload?.productGroups ?? []) {
    for (const decorated of group?.decoratedProducts ?? []) {
      const parsed = finalizeStoreProduct(parseOcadoPlatformProduct(decorated), storeId);
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
 * @param {string} storeId
 * @param {string} origin
 * @param {(url: string, headers: Record<string, string>) => Promise<unknown>} fetchSearchJson
 * @param {import('../common.js').Throttle} throttle
 */
export async function crawlOcadoPlatformSearch(term, maxPages, storeId, origin, fetchSearchJson, throttle) {
  /** @type {import('../common.js').RawStoreProduct[]} */
  const products = [];
  let pageToken;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      q: term.slice(0, 50),
      tag: 'web',
      maxProductsToDecorate: '48',
      maxPageSize: '48',
    });

    if (page === 1) {
      params.set('includeAdditionalPageInfo', 'true');
    }

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    await throttle.wait();

    let payload;
    try {
      payload = await fetchSearchJson(`${origin}/api/webproductpagews/v6/product-pages/search?${params}`, {
        Referer: `${origin}/search?query=${encodeURIComponent(term)}`,
        Origin: origin,
      });
    } catch (error) {
      if (page === 1) {
        throw error;
      }
      break;
    }

    const before = products.length;
    products.push(...collectOcadoPlatformProducts(payload, storeId));
    pageToken = payload?.metadata?.nextPageToken;

    if (products.length === before || !pageToken) {
      break;
    }
  }

  return products;
}
