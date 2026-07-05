/**
 * Product search/filter logic (shared by app + tests).
 */

export function normalizeBarcode(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function normalizeSku(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function findProductByBarcode(products, barcode) {
  const code = normalizeBarcode(barcode);
  if (!code) {
    return null;
  }

  return (
    products.find((product) => {
      if (normalizeBarcode(product.barcode) === code) {
        return true;
      }
      return (product.barcodes ?? []).some((entry) => normalizeBarcode(entry) === code);
    }) ?? null
  );
}

export function findProductsBySku(products, sku) {
  const normalized = normalizeSku(sku);
  if (!normalized) {
    return [];
  }

  return products.filter((product) => {
    const skus = product.skus ?? {};
    return Object.values(skus).some((entry) => normalizeSku(entry) === normalized);
  });
}

function matchesText(product, query) {
  const q = query.toLowerCase();
  return (
    product.name.toLowerCase().includes(q) ||
    product.category.toLowerCase().includes(q) ||
    product.brand?.toLowerCase().includes(q) ||
    (product.searchTerms?.some((term) => term.toLowerCase().includes(q)) ?? false)
  );
}

export function filterProducts(products, query, limit = 24) {
  const trimmed = query.trim();
  if (!trimmed) {
    return products.slice(0, limit);
  }

  const barcodeMatch = findProductByBarcode(products, trimmed);
  if (barcodeMatch) {
    return [barcodeMatch];
  }

  const skuMatches = findProductsBySku(products, trimmed);
  if (skuMatches.length) {
    return skuMatches.slice(0, limit);
  }

  const q = trimmed.toLowerCase();
  const results = [];
  for (const product of products) {
    if (matchesText(product, q)) {
      results.push(product);
      if (results.length >= limit) {
        break;
      }
    }
  }
  return results;
}

export function isBarcodeQuery(query) {
  const digits = normalizeBarcode(query);
  return digits.length >= 8;
}

export function isSkuQuery(query) {
  const trimmed = query.trim();
  return /^[a-z0-9-]{4,}$/i.test(trimmed) && /\d/.test(trimmed);
}
