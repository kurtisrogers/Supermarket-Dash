/**
 * Add brand, barcode, and per-supermarket SKU metadata to seed products.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, '../src/data/products.seed.json');

const brandedUpdates = {
  'baked-beans-415g': {
    brand: 'Heinz',
    name: 'Heinz Baked Beans 415g',
    barcode: '5016000120518',
    searchTerms: ['heinz baked beans 415g', 'heinz beans'],
    skus: { tesco: '258372015', sainsburys: '6449102', asda: '4105678', morrisons: '1129034' },
  },
  'cereal-cornflakes-500g': {
    brand: "Kellogg's",
    name: "Kellogg's Corn Flakes 500g",
    barcode: '5000112548165',
    searchTerms: ['kelloggs corn flakes 500g', 'cornflakes'],
    skus: { tesco: '255430011', sainsburys: '7551044', asda: '3982210', morrisons: '1056721' },
  },
  'bread-white-800g': {
    brand: 'Hovis',
    name: 'Hovis Soft White Bread 800g',
    barcode: '5010179200116',
    searchTerms: ['hovis soft white bread 800g', 'hovis bread'],
    skus: { tesco: '250182044', sainsburys: '6012833', asda: '3600145', morrisons: '1012988' },
  },
  'cheese-cheddar-400g': {
    brand: 'Cathedral City',
    name: 'Cathedral City Mature Cheddar 400g',
    barcode: '5000112548184',
    searchTerms: ['cathedral city mature cheddar 400g', 'cathedral city cheddar'],
    skus: { tesco: '260014522', sainsburys: '6442219', asda: '4120098', morrisons: '1183340' },
  },
  'butter-salted-250g': {
    brand: 'Lurpak',
    name: 'Lurpak Slightly Salted Butter 250g',
    barcode: '5701263050001',
    searchTerms: ['lurpak slightly salted butter 250g', 'lurpak butter'],
    skus: { tesco: '254998120', sainsburys: '6284410', asda: '3777012', morrisons: '1098844' },
  },
  'tea-bags-240': {
    brand: 'PG Tips',
    name: 'PG Tips Original Tea Bags 240',
    barcode: '5000197020312',
    searchTerms: ['pg tips tea bags 240', 'pg tips'],
    skus: { tesco: '257701002', sainsburys: '6500198', asda: '4055102', morrisons: '1142201' },
  },
  'coffee-instant-200g': {
    brand: 'Nescafé',
    name: 'Nescafé Original Instant Coffee 200g',
    barcode: '3033718130016',
    searchTerms: ['nescafe original instant coffee 200g', 'nescafe original'],
    skus: { tesco: '259004411', sainsburys: '6610021', asda: '4201188', morrisons: '1200099' },
  },
  'crisps-multipack-12': {
    brand: 'Walkers',
    name: 'Walkers Variety Crisps 12 Pack',
    barcode: '5000328930008',
    searchTerms: ['walkers variety crisps 12 pack', 'walkers crisps'],
    skus: { tesco: '261118900', sainsburys: '6704412', asda: '4310091', morrisons: '1255011' },
  },
  'chocolate-bar-4pack': {
    brand: 'Cadbury',
    name: 'Cadbury Dairy Milk Bars 4 Pack',
    barcode: '7622210449283',
    searchTerms: ['cadbury dairy milk 4 pack', 'cadbury dairy milk'],
    skus: { tesco: '262004510', sainsburys: '6801199', asda: '4402210', morrisons: '1270098' },
  },
  'fish-fingers-20': {
    brand: "Birds Eye",
    name: 'Birds Eye Fish Fingers 20 Pack',
    barcode: '5000112548123',
    searchTerms: ['birds eye fish fingers 20 pack', 'birds eye fish fingers'],
    skus: { tesco: '258801144', sainsburys: '6559012', asda: '4155011', morrisons: '1167012' },
  },
  'toothpaste-100ml': {
    brand: 'Colgate',
    name: 'Colgate Total Toothpaste 100ml',
    barcode: '5012028000108',
    searchTerms: ['colgate total toothpaste 100ml', 'colgate total'],
    skus: { tesco: '264501188', sainsburys: '6901188', asda: '4509012', morrisons: '1304410' },
  },
  'orange-juice-1l': {
    brand: 'innocent',
    name: 'innocent Smooth Orange Juice 900ml',
    barcode: '5060088520174',
    searchTerms: ['innocent smooth orange juice', 'innocent orange juice'],
    skus: { tesco: '265901244', sainsburys: '7010021', asda: '4601180', morrisons: '1310099' },
  },
};

const newBrandedProducts = [
  {
    id: 'marmite-250g',
    brand: 'Marmite',
    name: 'Marmite Yeast Extract 250g',
    category: 'Cupboard',
    barcode: '5018445300010',
    searchTerms: ['marmite yeast extract 250g', 'marmite'],
    skus: { tesco: '266701002', sainsburys: '7104410', asda: '4700098', morrisons: '1321188' },
    prices: {
      tesco: { standard: 3.00, loyalty: 2.50 },
      sainsburys: { standard: 3.10, loyalty: 2.60 },
      asda: { standard: 2.85, loyalty: null },
      morrisons: { standard: 3.05, loyalty: 2.55 },
      aldi: { standard: 2.19, loyalty: null },
      lidl: { standard: 2.09, loyalty: null },
      waitrose: { standard: 3.40, loyalty: 2.90 },
      ocado: { standard: 3.35, loyalty: null },
    },
  },
  {
    id: 'heinz-soup-tomato-400g',
    brand: 'Heinz',
    name: 'Heinz Cream of Tomato Soup 400g',
    category: 'Cupboard',
    barcode: '5016000120125',
    searchTerms: ['heinz cream of tomato soup 400g', 'heinz tomato soup'],
    skus: { tesco: '267801144', sainsburys: '7201180', asda: '4802211', morrisons: '1330091' },
    prices: {
      tesco: { standard: 1.40, loyalty: 1.10 },
      sainsburys: { standard: 1.45, loyalty: 1.15 },
      asda: { standard: 1.35, loyalty: null },
      morrisons: { standard: 1.42, loyalty: 1.12 },
      aldi: { standard: 0.89, loyalty: null },
      lidl: { standard: 0.85, loyalty: null },
      waitrose: { standard: 1.60, loyalty: 1.30 },
      ocado: { standard: 1.55, loyalty: null },
    },
  },
  {
    id: 'weetabix-24',
    brand: 'Weetabix',
    name: 'Weetabix Original 24 Pack',
    category: 'Breakfast',
    barcode: '5016177010010',
    searchTerms: ['weetabix original 24 pack', 'weetabix'],
    skus: { tesco: '268901002', sainsburys: '7304412', asda: '4901188', morrisons: '1342200' },
    prices: {
      tesco: { standard: 3.50, loyalty: 2.75 },
      sainsburys: { standard: 3.60, loyalty: 2.85 },
      asda: { standard: 3.25, loyalty: null },
      morrisons: { standard: 3.55, loyalty: 2.80 },
      aldi: { standard: 2.49, loyalty: null },
      lidl: { standard: 2.39, loyalty: null },
      waitrose: { standard: 4.00, loyalty: 3.25 },
      ocado: { standard: 3.95, loyalty: null },
    },
  },
];

const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));

seed.products = seed.products.map((product) => {
  const branded = brandedUpdates[product.id];
  return branded ? { ...product, ...branded } : product;
});

const existingIds = new Set(seed.products.map((product) => product.id));
for (const product of newBrandedProducts) {
  if (!existingIds.has(product.id)) {
    seed.products.push(product);
  }
}

writeFileSync(SEED_PATH, `${JSON.stringify(seed, null, 2)}\n`);
console.log(`Updated ${Object.keys(brandedUpdates).length} products with brand metadata`);
console.log(`Added ${newBrandedProducts.length} new branded products`);
