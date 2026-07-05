import { mapPepestoCatalog } from '../pepesto-catalog.js';
import { buildStoreCatalog } from './common.js';

const PEPESTO_API = 'https://api.pepesto.com/api';

export const PEPESTO_STORE_DOMAINS = {
  asda: 'asda.com',
  morrisons: 'groceries.morrisons.com',
  waitrose: 'waitrose.com',
};

async function pepestoPost(apiKey, endpoint, body) {
  const response = await fetch(`${PEPESTO_API}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Pepesto ${endpoint} error (${response.status}) for ${body.supermarket_domain}${detail ? `: ${detail.slice(0, 120)}` : ''}`,
    );
  }

  return response.json();
}

/**
 * @param {string} storeId
 * @param {string} domain
 * @param {string} apiKey
 */
export async function fetchPepestoStoreCatalog(storeId, domain, apiKey) {
  const [catalogPayload, promoPayload] = await Promise.all([
    pepestoPost(apiKey, 'catalog', { supermarket_domain: domain }),
    pepestoPost(apiKey, 'promotions', { supermarket_domain: domain }).catch(() => ({ parsed_products: {} })),
  ]);

  const catalogProducts = catalogPayload?.parsed_products ?? {};
  const promoProducts = promoPayload?.parsed_products ?? {};
  const mapped = mapPepestoCatalog(storeId, catalogProducts, promoProducts);

  const raws = mapped.map((item) => ({
    sku: item.sku,
    name: item.name,
    brand: item.brand,
    ownLabel: item.ownLabel,
    storeLabel: item.storeLabel,
    category: item.category,
    price: item.price,
  }));

  return buildStoreCatalog(storeId, raws, {
    fetchMethod: 'pepesto',
    domain,
    catalogSkus: Object.keys(catalogProducts).length,
    promoSkus: Object.keys(promoProducts).length,
  });
}
