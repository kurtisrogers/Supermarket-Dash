/**
 * Merge per-supermarket catalog seeds into a unified comparison catalogue.
 */

export function normalizeMatchKey(product) {
  const barcode = String(product.barcode ?? '').replace(/\D/g, '');
  if (barcode.length >= 8) {
    return `barcode:${barcode}`;
  }

  if (product.productGroup) {
    const brand = product.brand ? product.brand.toLowerCase() : 'own-label';
    return `group:${product.productGroup}:${brand}:${product.storeId ?? 'any'}`;
  }

  return `id:${product.storeId ?? 'unknown'}:${product.id}`;
}

export function mergeStoreCatalogs(storeCatalogs) {
  const groups = new Map();

  for (const catalog of storeCatalogs) {
    const storeId = catalog.meta.storeId;

    for (const item of catalog.products) {
      const storeProduct = { ...item, storeId: item.storeId ?? storeId };
      const matchKey = normalizeMatchKey(storeProduct);

      if (!groups.has(matchKey)) {
        groups.set(matchKey, {
          matchKey,
          items: [],
        });
      }

      groups.get(matchKey).items.push(storeProduct);
    }
  }

  const products = [...groups.values()].map((group) => buildUnifiedProduct(group.items));

  products.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

  return products;
}

function buildUnifiedProduct(storeItems) {
  const branded = storeItems.find((item) => item.brand && item.brand !== item.storeLabel);
  const primary = branded ?? storeItems[0];

  const prices = {};
  const skus = {};
  const storeIds = [];

  for (const item of storeItems) {
    const storeId = item.storeId;
    storeIds.push(storeId);
    prices[storeId] = { ...item.price };

    if (item.sku) {
      skus[storeId] = item.sku;
    }
  }

  const searchTerms = new Set(primary.searchTerms ?? []);
  for (const item of storeItems) {
    for (const term of item.searchTerms ?? []) {
      searchTerms.add(term);
    }
    searchTerms.add(item.name.toLowerCase());
    if (item.brand) {
      searchTerms.add(item.brand.toLowerCase());
    }
    if (item.sku) {
      searchTerms.add(item.sku);
    }
  }

  return {
    id: primary.unifiedId ?? primary.productGroup ?? primary.id,
    name: primary.name,
    brand: primary.brand ?? null,
    category: primary.category,
    productGroup: primary.productGroup ?? null,
    barcode: primary.barcode ?? null,
    ownLabel: Boolean(primary.ownLabel),
    storeLabel: primary.storeLabel ?? null,
    availableAt: [...new Set(storeIds)].sort(),
    searchTerms: [...searchTerms],
    skus,
    prices,
  };
}

export function summarizeCatalogs(storeCatalogs, mergedProducts) {
  const perStore = Object.fromEntries(
    storeCatalogs.map((catalog) => [catalog.meta.storeId, catalog.products.length]),
  );

  return {
    storeProductCounts: perStore,
    totalStoreEntries: storeCatalogs.reduce((sum, catalog) => sum + catalog.products.length, 0),
    unifiedProductCount: mergedProducts.length,
    brandedCount: mergedProducts.filter((product) => product.brand && !product.ownLabel).length,
    ownLabelCount: mergedProducts.filter((product) => product.ownLabel).length,
  };
}
