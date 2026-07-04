import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SEED_PATH = join(ROOT, 'src/data/products.seed.json');
const OUTPUT_PATH = join(ROOT, 'src/data/products.json');
const SUPERMARKETS_PATH = join(ROOT, 'src/data/supermarkets.json');

const PEPESTO_DOMAINS = {
  tesco: 'tesco.com',
  sainsburys: 'sainsburys.co.uk',
  asda: 'asda.com',
  morrisons: 'groceries.morrisons.com',
  waitrose: 'waitrose.com',
  ocado: 'ocado.com',
};

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function fetchPepestoProduct(apiKey, domain, searchTerm) {
  const response = await fetch('https://api.pepesto.com/api/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain,
      query: searchTerm,
      limit: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pepesto API error (${response.status}) for ${domain}: ${searchTerm}`);
  }

  const payload = await response.json();
  const match = payload?.products?.[0] ?? payload?.results?.[0] ?? payload?.[0];
  if (!match) {
    return null;
  }

  const standard = Number(match.price ?? match.standard_price);
  const loyalty = Number(match.promotional_price ?? match.loyalty_price ?? match.clubcard_price);

  if (!Number.isFinite(standard)) {
    return null;
  }

  return {
    standard,
    loyalty: Number.isFinite(loyalty) && loyalty < standard ? loyalty : null,
  };
}

async function updateFromPepesto(seed, apiKey) {
  const updated = structuredClone(seed.products);
  let apiHits = 0;
  let apiMisses = 0;

  for (const product of updated) {
    for (const [storeId, domain] of Object.entries(PEPESTO_DOMAINS)) {
      if (!product.prices[storeId]) {
        continue;
      }

      const searchTerm = product.searchTerms?.[0] ?? product.name;
      try {
        const livePrice = await fetchPepestoProduct(apiKey, domain, searchTerm);
        if (livePrice) {
          product.prices[storeId] = livePrice;
          apiHits += 1;
        } else {
          apiMisses += 1;
        }
      } catch (error) {
        console.warn(`  ⚠ ${storeId}/${product.id}: ${error.message}`);
        apiMisses += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { products: updated, apiHits, apiMisses };
}

function buildFromSeed(seed) {
  return { products: structuredClone(seed.products), apiHits: 0, apiMisses: 0 };
}

async function main() {
  console.log('Supermarket Dash — price update\n');

  const seed = loadJson(SEED_PATH);
  const supermarkets = loadJson(SUPERMARKETS_PATH);
  const apiKey = process.env.PEPESTO_API_KEY?.trim();

  let source = 'seed';
  let products;
  let apiHits = 0;
  let apiMisses = 0;

  if (apiKey) {
    console.log('PEPESTO_API_KEY found — fetching live prices for online supermarkets…');
    try {
      const result = await updateFromPepesto(seed, apiKey);
      products = result.products;
      apiHits = result.apiHits;
      apiMisses = result.apiMisses;
      source = 'pepesto';
      console.log(`  Live prices updated: ${apiHits} hits, ${apiMisses} misses`);
    } catch (error) {
      console.warn(`Pepesto fetch failed, falling back to seed data: ${error.message}`);
      products = buildFromSeed(seed).products;
    }
  } else {
    console.log('No PEPESTO_API_KEY — using curated seed prices.');
    console.log('  Add PEPESTO_API_KEY to GitHub Secrets for live daily updates.');
    products = buildFromSeed(seed).products;
  }

  const output = {
    meta: {
      lastUpdated: new Date().toISOString(),
      source,
      productCount: products.length,
      storeCount: supermarkets.length,
      apiHits,
      apiMisses,
    },
    products,
  };

  writeJson(OUTPUT_PATH, output);
  console.log(`\n✓ Wrote ${products.length} products to src/data/products.json`);
  console.log(`  Source: ${source} | Updated: ${output.meta.lastUpdated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
