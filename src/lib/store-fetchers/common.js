import { storeOwnLabelPrefixes } from '../pepesto-catalog.js';

/** @typedef {{ standard: number, loyalty: number|null }} Price */
/** @typedef {{ sku: string, name: string, brand?: string|null, barcode?: string|null, category?: string, ownLabel?: boolean, storeLabel?: string|null, price: Price, url?: string }} RawStoreProduct */

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function categoryFacet(department) {
  return `b;${Buffer.from(department).toString('base64')}`;
}

export function inferBrandFromName(name, storeId) {
  const prefixes = storeOwnLabelPrefixes[storeId] ?? [];
  for (const prefix of prefixes) {
    if (name.startsWith(prefix)) {
      return { brand: prefix, ownLabel: true, storeLabel: prefix };
    }
  }

  const first = name.split(/\s+/)[0] ?? '';
  if (first.length >= 2 && /^[A-Z]/.test(first) && !/^\d/.test(first)) {
    return { brand: first.replace(/['']s$/i, ''), ownLabel: false, storeLabel: null };
  }

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

  return { brand: labels[storeId] ?? null, ownLabel: true, storeLabel: labels[storeId] ?? storeId };
}

/**
 * @param {string} storeId
 * @param {RawStoreProduct} raw
 */
export function toCatalogProduct(storeId, raw) {
  const standard = Number(raw.price?.standard);
  if (!Number.isFinite(standard) || standard <= 0) {
    return null;
  }

  const loyaltyRaw = raw.price?.loyalty;
  const loyalty =
    loyaltyRaw != null && Number.isFinite(Number(loyaltyRaw)) && Number(loyaltyRaw) < standard
      ? Number(loyaltyRaw)
      : null;

  const brandInfo = raw.brand
    ? { brand: raw.brand, ownLabel: Boolean(raw.ownLabel), storeLabel: raw.storeLabel ?? null }
    : inferBrandFromName(raw.name, storeId);

  const slug = `${storeId}-${raw.sku}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const searchTerms = [raw.name.toLowerCase(), raw.sku, raw.brand?.toLowerCase(), raw.barcode].filter(Boolean);

  return {
    id: slug,
    productGroup: null,
    storeId,
    name: raw.name,
    brand: brandInfo.brand,
    storeLabel: brandInfo.storeLabel,
    barcode: raw.barcode ?? null,
    category: raw.category ?? 'Grocery',
    searchTerms: [...new Set(searchTerms)],
    ownLabel: brandInfo.ownLabel,
    sku: String(raw.sku),
    price: { standard, loyalty },
  };
}

/**
 * @param {string} storeId
 * @param {RawStoreProduct[]} raws
 */
export function buildStoreCatalog(storeId, raws, metaExtra = {}) {
  const bySku = new Map();

  for (const raw of raws) {
    const product = toCatalogProduct(storeId, raw);
    if (product) {
      bySku.set(product.sku, product);
    }
  }

  const products = [...bySku.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

  return {
    meta: {
      storeId,
      source: 'live-fetch',
      lastUpdated: new Date().toISOString(),
      productCount: products.length,
      ...metaExtra,
    },
    products,
  };
}

export class Throttle {
  /** @param {number} ms */
  constructor(ms = 1100) {
    this.ms = ms;
    this.nextAt = 0;
  }

  async wait() {
    const delay = this.nextAt - Date.now();
    if (delay > 0) {
      await sleep(delay);
    }
    this.nextAt = Date.now() + this.ms;
  }
}
