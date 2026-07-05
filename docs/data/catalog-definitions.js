/**
 * Product templates used to generate per-supermarket catalog seeds.
 * Each template expands into branded + own-label listings per store.
 */
export const storeLabels = {
  tesco: 'Tesco',
  sainsburys: "Sainsbury's",
  asda: 'Asda',
  morrisons: 'Morrisons',
  aldi: 'Aldi',
  lidl: 'Lidl',
  waitrose: 'Waitrose',
  ocado: 'Ocado',
};

/** @type {Record<string, number>} */
export const storePriceFactor = {
  tesco: 1.0,
  sainsburys: 1.02,
  asda: 0.97,
  morrisons: 1.01,
  aldi: 0.78,
  lidl: 0.76,
  waitrose: 1.15,
  ocado: 1.12,
};

/**
 * @typedef {{ standard: number, loyalty: number|null }} Price
 * @typedef {{ productGroup: string, category: string, searchTerms: string[], branded?: object, ownLabel?: object }} ProductTemplate
 */

/** @type {ProductTemplate[]} */
export const productTemplates = [
  {
    productGroup: 'milk-semi-2l',
    category: 'Dairy',
    searchTerms: ['semi skimmed milk 2l'],
    ownLabel: {
      name: 'Semi-Skimmed Milk 2L',
      price: { standard: 1.45, loyalty: 1.29 },
      skuBase: 100001,
    },
  },
  {
    productGroup: 'bread-white-800g',
    category: 'Bakery',
    searchTerms: ['white bread 800g'],
    branded: {
      brand: 'Hovis',
      name: 'Hovis Soft White Bread 800g',
      barcode: '5010179200116',
      price: { standard: 1.35, loyalty: 1.15 },
      skuBase: 200001,
    },
    ownLabel: {
      name: 'White Bread 800g',
      price: { standard: 0.75, loyalty: 0.55 },
      skuBase: 200101,
    },
  },
  {
    productGroup: 'baked-beans-415g',
    category: 'Cupboard',
    searchTerms: ['baked beans 415g'],
    branded: {
      brand: 'Heinz',
      name: 'Heinz Baked Beans 415g',
      barcode: '5016000120518',
      price: { standard: 1.4, loyalty: 1.2 },
      skuBase: 300001,
    },
    ownLabel: {
      name: 'Baked Beans in Tomato Sauce 415g',
      price: { standard: 0.45, loyalty: 0.35 },
      skuBase: 300101,
    },
  },
  {
    productGroup: 'cornflakes-500g',
    category: 'Breakfast',
    searchTerms: ['cornflakes 500g'],
    branded: {
      brand: "Kellogg's",
      name: "Kellogg's Corn Flakes 500g",
      barcode: '5000112548165',
      price: { standard: 2.75, loyalty: 2.25 },
      skuBase: 400001,
    },
    ownLabel: {
      name: 'Cornflakes 500g',
      price: { standard: 0.95, loyalty: null },
      skuBase: 400101,
    },
  },
  {
    productGroup: 'cheddar-400g',
    category: 'Dairy',
    searchTerms: ['mature cheddar 400g'],
    branded: {
      brand: 'Cathedral City',
      name: 'Cathedral City Mature Cheddar 400g',
      barcode: '5000112548184',
      price: { standard: 4.25, loyalty: 3.5 },
      skuBase: 500001,
    },
    ownLabel: {
      name: 'Mature Cheddar 400g',
      price: { standard: 2.65, loyalty: 2.15 },
      skuBase: 500101,
    },
  },
  {
    productGroup: 'butter-250g',
    category: 'Dairy',
    searchTerms: ['salted butter 250g'],
    branded: {
      brand: 'Lurpak',
      name: 'Lurpak Slightly Salted Butter 250g',
      barcode: '5701263050001',
      price: { standard: 2.85, loyalty: 2.45 },
      skuBase: 600001,
    },
    ownLabel: {
      name: 'Salted Butter 250g',
      price: { standard: 1.79, loyalty: 1.49 },
      skuBase: 600101,
    },
  },
  {
    productGroup: 'eggs-free-range-12',
    category: 'Dairy',
    searchTerms: ['free range eggs 12'],
    ownLabel: {
      name: 'Free Range Eggs (12)',
      price: { standard: 2.75, loyalty: 2.45 },
      skuBase: 700101,
    },
  },
  {
    productGroup: 'chicken-breast-1kg',
    category: 'Meat',
    searchTerms: ['chicken breast 1kg'],
    ownLabel: {
      name: 'Chicken Breast Fillets 1kg',
      price: { standard: 5.75, loyalty: 5.25 },
      skuBase: 800101,
    },
  },
  {
    productGroup: 'beef-mince-500g',
    category: 'Meat',
    searchTerms: ['beef mince 500g'],
    ownLabel: {
      name: 'Beef Mince 500g (5% fat)',
      price: { standard: 3.75, loyalty: 3.25 },
      skuBase: 900101,
    },
  },
  {
    productGroup: 'bananas-5',
    category: 'Fruit & Veg',
    searchTerms: ['bananas 5 pack'],
    ownLabel: {
      name: 'Bananas (5 pack)',
      price: { standard: 0.99, loyalty: null },
      skuBase: 1000101,
    },
  },
  {
    productGroup: 'potatoes-2kg',
    category: 'Fruit & Veg',
    searchTerms: ['maris piper potatoes 2kg'],
    ownLabel: {
      name: 'Maris Piper Potatoes 2kg',
      price: { standard: 1.39, loyalty: 1.19 },
      skuBase: 1100101,
    },
  },
  {
    productGroup: 'pasta-penne-500g',
    category: 'Cupboard',
    searchTerms: ['penne pasta 500g'],
    branded: {
      brand: 'Napolina',
      name: 'Napolina Penne Pasta 500g',
      barcode: '5010179000015',
      price: { standard: 1.25, loyalty: 1.0 },
      skuBase: 1200001,
    },
    ownLabel: {
      name: 'Penne Pasta 500g',
      price: { standard: 0.55, loyalty: 0.45 },
      skuBase: 1200101,
    },
  },
  {
    productGroup: 'rice-basmati-1kg',
    category: 'Cupboard',
    searchTerms: ['basmati rice 1kg'],
    ownLabel: {
      name: 'Basmati Rice 1kg',
      price: { standard: 1.85, loyalty: 1.55 },
      skuBase: 1300101,
    },
  },
  {
    productGroup: 'chopped-tomatoes-400g',
    category: 'Cupboard',
    searchTerms: ['chopped tomatoes 400g'],
    ownLabel: {
      name: 'Chopped Tomatoes 400g',
      price: { standard: 0.35, loyalty: 0.28 },
      skuBase: 1400101,
    },
  },
  {
    productGroup: 'tea-bags-240',
    category: 'Drinks',
    searchTerms: ['tea bags 240'],
    branded: {
      brand: 'PG Tips',
      name: 'PG Tips Original Tea Bags 240',
      barcode: '5000197020312',
      price: { standard: 4.75, loyalty: 3.85 },
      skuBase: 1500001,
    },
    ownLabel: {
      name: 'Tea Bags (240)',
      price: { standard: 2.45, loyalty: null },
      skuBase: 1500101,
    },
  },
  {
    productGroup: 'coffee-instant-200g',
    category: 'Drinks',
    searchTerms: ['instant coffee 200g'],
    branded: {
      brand: 'Nescafé',
      name: 'Nescafé Original Instant Coffee 200g',
      barcode: '3033718130016',
      price: { standard: 6.25, loyalty: 5.25 },
      skuBase: 1600001,
    },
    ownLabel: {
      name: 'Instant Coffee 200g',
      price: { standard: 3.25, loyalty: null },
      skuBase: 1600101,
    },
  },
  {
    productGroup: 'orange-juice-1l',
    category: 'Drinks',
    searchTerms: ['orange juice'],
    branded: {
      brand: 'innocent',
      name: 'innocent Smooth Orange Juice 900ml',
      barcode: '5060088520174',
      price: { standard: 3.25, loyalty: 2.75 },
      skuBase: 1700001,
    },
    ownLabel: {
      name: 'Orange Juice 1L',
      price: { standard: 1.15, loyalty: 0.95 },
      skuBase: 1700101,
    },
  },
  {
    productGroup: 'water-6x1.5l',
    category: 'Drinks',
    searchTerms: ['still water 6 pack'],
    ownLabel: {
      name: 'Still Water 6x1.5L',
      price: { standard: 1.75, loyalty: 1.45 },
      skuBase: 1800101,
    },
  },
  {
    productGroup: 'crisps-multipack-12',
    category: 'Snacks',
    searchTerms: ['crisps multipack 12'],
    branded: {
      brand: 'Walkers',
      name: 'Walkers Variety Crisps 12 Pack',
      barcode: '5000328930008',
      price: { standard: 3.95, loyalty: 3.25 },
      skuBase: 1900001,
    },
    ownLabel: {
      name: 'Crisps Multipack (12)',
      price: { standard: 1.75, loyalty: null },
      skuBase: 1900101,
    },
  },
  {
    productGroup: 'chocolate-4pack',
    category: 'Snacks',
    searchTerms: ['chocolate bar 4 pack'],
    branded: {
      brand: 'Cadbury',
      name: 'Cadbury Dairy Milk Bars 4 Pack',
      barcode: '7622210449283',
      price: { standard: 2.85, loyalty: 2.25 },
      skuBase: 2000001,
    },
    ownLabel: {
      name: 'Chocolate Bar 4 Pack',
      price: { standard: 1.35, loyalty: null },
      skuBase: 2000101,
    },
  },
  {
    productGroup: 'fish-fingers-20',
    category: 'Frozen',
    searchTerms: ['fish fingers 20 pack'],
    branded: {
      brand: 'Birds Eye',
      name: 'Birds Eye Fish Fingers 20 Pack',
      barcode: '5000112548123',
      price: { standard: 4.25, loyalty: 3.5 },
      skuBase: 2100001,
    },
    ownLabel: {
      name: 'Fish Fingers (20 pack)',
      price: { standard: 2.15, loyalty: null },
      skuBase: 2100101,
    },
  },
  {
    productGroup: 'frozen-peas-900g',
    category: 'Frozen',
    searchTerms: ['frozen peas 900g'],
    ownLabel: {
      name: 'Frozen Peas 900g',
      price: { standard: 1.05, loyalty: 0.85 },
      skuBase: 2200101,
    },
  },
  {
    productGroup: 'toilet-roll-9',
    category: 'Household',
    searchTerms: ['toilet roll 9 pack'],
    branded: {
      brand: 'Andrex',
      name: 'Andrex Classic Clean Toilet Roll 9 Pack',
      barcode: '5000112548191',
      price: { standard: 5.5, loyalty: 4.5 },
      skuBase: 2300001,
    },
    ownLabel: {
      name: 'Toilet Roll 9 Pack',
      price: { standard: 3.25, loyalty: 2.75 },
      skuBase: 2300101,
    },
  },
  {
    productGroup: 'washing-up-450ml',
    category: 'Household',
    searchTerms: ['washing up liquid 450ml'],
    branded: {
      brand: 'Fairy',
      name: 'Fairy Original Washing Up Liquid 450ml',
      barcode: '5000101207327',
      price: { standard: 1.75, loyalty: 1.45 },
      skuBase: 2400001,
    },
    ownLabel: {
      name: 'Washing Up Liquid 450ml',
      price: { standard: 0.75, loyalty: 0.55 },
      skuBase: 2400101,
    },
  },
  {
    productGroup: 'shampoo-400ml',
    category: 'Toiletries',
    searchTerms: ['shampoo 400ml'],
    branded: {
      brand: 'Head & Shoulders',
      name: 'Head & Shoulders Classic Shampoo 400ml',
      barcode: '5010179000015',
      price: { standard: 4.5, loyalty: 3.75 },
      skuBase: 2500001,
    },
    ownLabel: {
      name: 'Shampoo 400ml',
      price: { standard: 1.85, loyalty: null },
      skuBase: 2500101,
    },
  },
  {
    productGroup: 'toothpaste-100ml',
    category: 'Toiletries',
    searchTerms: ['toothpaste 100ml'],
    branded: {
      brand: 'Colgate',
      name: 'Colgate Total Toothpaste 100ml',
      barcode: '5012028000108',
      price: { standard: 3.25, loyalty: 2.65 },
      skuBase: 2600001,
    },
    ownLabel: {
      name: 'Toothpaste 100ml',
      price: { standard: 1.45, loyalty: null },
      skuBase: 2600101,
    },
  },
  {
    productGroup: 'marmite-250g',
    category: 'Cupboard',
    searchTerms: ['marmite 250g'],
    branded: {
      brand: 'Marmite',
      name: 'Marmite Yeast Extract 250g',
      barcode: '5018445300010',
      price: { standard: 3.0, loyalty: 2.65 },
      skuBase: 2700001,
    },
  },
  {
    productGroup: 'heinz-soup-tomato-400g',
    category: 'Cupboard',
    searchTerms: ['heinz tomato soup 400g'],
    branded: {
      brand: 'Heinz',
      name: 'Heinz Cream of Tomato Soup 400g',
      barcode: '5016000120125',
      price: { standard: 1.45, loyalty: 1.15 },
      skuBase: 2800001,
    },
    ownLabel: {
      name: 'Cream of Tomato Soup 400g',
      price: { standard: 0.75, loyalty: 0.55 },
      skuBase: 2800101,
    },
  },
  {
    productGroup: 'weetabix-24',
    category: 'Breakfast',
    searchTerms: ['weetabix 24 pack'],
    branded: {
      brand: 'Weetabix',
      name: 'Weetabix Original 24 Pack',
      barcode: '5016177010010',
      price: { standard: 3.75, loyalty: 3.15 },
      skuBase: 2900001,
    },
    ownLabel: {
      name: 'Wheat Biscuits 24 Pack',
      price: { standard: 1.99, loyalty: null },
      skuBase: 2900101,
    },
  },
  {
    productGroup: 'salmon-fillets-2',
    category: 'Fish',
    searchTerms: ['salmon fillets 2 pack'],
    ownLabel: {
      name: 'Salmon Fillets (2 pack)',
      price: { standard: 4.75, loyalty: 4.25 },
      skuBase: 3000101,
    },
  },
  {
    productGroup: 'onions-1kg',
    category: 'Fruit & Veg',
    searchTerms: ['brown onions 1kg'],
    ownLabel: {
      name: 'Brown Onions 1kg',
      price: { standard: 0.85, loyalty: null },
      skuBase: 3100101,
    },
  },
  {
    productGroup: 'carrots-1kg',
    category: 'Fruit & Veg',
    searchTerms: ['carrots 1kg'],
    ownLabel: {
      name: 'Carrots 1kg',
      price: { standard: 0.55, loyalty: null },
      skuBase: 3200101,
    },
  },
];
