/* Supermarket Dash — bundled app */
/**
 * Price comparison and multi-store savings optimizer.
 */

function formatGBP(amount) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

function hasLoyaltyCard(supermarket, loyaltyCards) {
  return Boolean(supermarket.loyaltyKey && loyaltyCards.includes(supermarket.loyaltyKey));
}

function getItemPrice(product, storeId, supermarkets, loyaltyCards) {
  const storePrice = product.prices?.[storeId];
  if (!storePrice) {
    return null;
  }

  const supermarket = supermarkets.find((s) => s.id === storeId);
  const useLoyalty = hasLoyaltyCard(supermarket, loyaltyCards);
  const price = useLoyalty && storePrice.loyalty != null ? storePrice.loyalty : storePrice.standard;

  return {
    price,
    isLoyalty: useLoyalty && storePrice.loyalty != null && storePrice.loyalty < storePrice.standard,
    standard: storePrice.standard,
    loyalty: storePrice.loyalty,
  };
}

function compareList(cartItems, products, supermarkets, loyaltyCards) {
  const storeIds = supermarkets.map((s) => s.id);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const storeTotals = storeIds.map((storeId) => {
    let total = 0;
    let missing = 0;
    const items = [];

    for (const { productId, quantity } of cartItems) {
      const product = productMap.get(productId);
      if (!product) {
        continue;
      }

      const priceInfo = getItemPrice(product, storeId, supermarkets, loyaltyCards);
      if (!priceInfo) {
        missing += 1;
        continue;
      }

      const lineTotal = priceInfo.price * quantity;
      total += lineTotal;
      items.push({
        productId,
        name: product.name,
        quantity,
        unitPrice: priceInfo.price,
        lineTotal,
        isLoyalty: priceInfo.isLoyalty,
      });
    }

    return { storeId, total, missing, items };
  });

  storeTotals.sort((a, b) => a.total - b.total);

  const itemAssignments = [];
  let optimalTotal = 0;

  for (const { productId, quantity } of cartItems) {
    const product = productMap.get(productId);
    if (!product) {
      continue;
    }

    let bestStore = null;
    let bestPrice = Infinity;
    let bestIsLoyalty = false;

    for (const storeId of storeIds) {
      const priceInfo = getItemPrice(product, storeId, supermarkets, loyaltyCards);
      if (priceInfo && priceInfo.price < bestPrice) {
        bestPrice = priceInfo.price;
        bestStore = storeId;
        bestIsLoyalty = priceInfo.isLoyalty;
      }
    }

    if (bestStore) {
      const lineTotal = bestPrice * quantity;
      optimalTotal += lineTotal;
      itemAssignments.push({
        productId,
        name: product.name,
        quantity,
        storeId: bestStore,
        unitPrice: bestPrice,
        lineTotal,
        isLoyalty: bestIsLoyalty,
      });
    }
  }

  const savingsMap = buildSavingsMap(itemAssignments, supermarkets);
  const bestSingleStore = storeTotals[0] ?? null;
  const savingsVsSingle =
    bestSingleStore && bestSingleStore.total > 0 ? bestSingleStore.total - optimalTotal : 0;

  const itemBreakdown = cartItems
    .map(({ productId, quantity }) => {
      const product = productMap.get(productId);
      if (!product) {
        return null;
      }

      const storePrices = storeIds
        .map((storeId) => {
          const info = getItemPrice(product, storeId, supermarkets, loyaltyCards);
          if (!info) {
            return null;
          }
          return { storeId, ...info, lineTotal: info.price * quantity };
        })
        .filter(Boolean)
        .sort((a, b) => a.price - b.price);

      return {
        productId,
        name: product.name,
        quantity,
        storePrices,
        cheapest: storePrices[0] ?? null,
      };
    })
    .filter(Boolean);

  return {
    storeTotals,
    bestSingleStore,
    optimalTotal,
    savingsVsSingle,
    savingsMap,
    itemAssignments,
    itemBreakdown,
    formatGBP,
  };
}

function buildSavingsMap(itemAssignments, supermarkets) {
  const byStore = new Map();

  for (const item of itemAssignments) {
    if (!byStore.has(item.storeId)) {
      byStore.set(item.storeId, []);
    }
    byStore.get(item.storeId).push(item);
  }

  return [...byStore.entries()]
    .map(([storeId, items]) => {
      const supermarket = supermarkets.find((s) => s.id === storeId);
      const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
      return {
        storeId,
        storeName: supermarket?.name ?? storeId,
        color: supermarket?.color ?? '#666',
        onlineGrocery: supermarket?.onlineGrocery ?? false,
        items,
        subtotal,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      };
    })
    .sort((a, b) => b.subtotal - a.subtotal);
}

if (typeof window !== 'undefined') {
  window.SupermarketCompare = { compareList, formatGBP, getItemPrice, buildSavingsMap };
}

/**
 * Basket helpers — copy lists and open supermarket search pages.
 * UK supermarkets do not expose public add-to-basket APIs for third parties.
 */

function buildSearchUrl(supermarket, productName) {
  const query = encodeURIComponent(productName);
  return supermarket.searchUrl.replace('{query}', query);
}

function formatListForStore(items, supermarket) {
  const header = `Shopping list for ${supermarket.name}\n${'─'.repeat(40)}\n`;
  const lines = items.map((item, index) => `${index + 1}. ${item.name} × ${item.quantity}`);
  const footer = `\n${'─'.repeat(40)}\nGenerated by Supermarket Dash`;
  return header + lines.join('\n') + footer;
}

function getBasketStrategy(supermarket) {
  const strategies = {
    partial: {
      label: 'Copy & search',
      steps: [
        'Copy your formatted list to clipboard',
        'Open the supermarket website',
        'Search each item and add to basket manually',
        'Use our quick-search links to jump straight to each product',
      ],
    },
    manual: {
      label: 'In-store list',
      steps: [
        'Copy or print your shopping list',
        'Visit the store in person',
        'Aldi and Lidl have limited online grocery — in-store is fastest',
      ],
    },
  };

  return strategies[supermarket.basketAutomation] ?? strategies.partial;
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

function openStoreWithFirstItem(supermarket, items) {
  if (!items.length) {
    return;
  }
  const url = buildSearchUrl(supermarket, items[0].name);
  window.open(url, '_blank', 'noopener');
}

function getQuickSearchLinks(supermarket, items) {
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    url: buildSearchUrl(supermarket, item.name),
  }));
}

if (typeof window !== 'undefined') {
  window.SupermarketBasket = {
    buildSearchUrl,
    formatListForStore,
    getBasketStrategy,
    copyToClipboard,
    openStoreWithFirstItem,
    getQuickSearchLinks,
  };
}

/**
 * Alpine.js application state and UI logic.
 */

function supermarketDash() {
  return {
    products: [],
    supermarkets: [],
    meta: {},
    cart: [],
    loyaltyCards: [],
    searchQuery: '',
    toast: '',
    basketModal: null,

    async init() {
      const [productsRes, marketsRes] = await Promise.all([
        fetch('data/products.json'),
        fetch('data/supermarkets.json'),
      ]);

      const productsData = await productsRes.json();
      this.products = productsData.products ?? productsData;
      this.meta = productsData.meta ?? {};
      this.supermarkets = await marketsRes.json();

      const saved = localStorage.getItem('supermarket-dash-cart');
      const savedCards = localStorage.getItem('supermarket-dash-loyalty');
      if (saved) {
        this.cart = JSON.parse(saved);
      }
      if (savedCards) {
        this.loyaltyCards = JSON.parse(savedCards);
      }
    },

    get filteredProducts() {
      const q = this.searchQuery.trim().toLowerCase();
      if (!q) {
        return this.products.slice(0, 12);
      }
      return this.products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.searchTerms?.some((t) => t.includes(q)),
      );
    },

    get comparison() {
      if (!this.cart.length || !this.products.length) {
        return null;
      }
      return SupermarketCompare.compareList(
        this.cart,
        this.products,
        this.supermarkets,
        this.loyaltyCards,
      );
    },

    get lastUpdatedLabel() {
      if (!this.meta.lastUpdated) {
        return 'Unknown';
      }
      return new Date(this.meta.lastUpdated).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },

    addToCart(product) {
      const existing = this.cart.find((c) => c.productId === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.cart.push({ productId: product.id, quantity: 1 });
      }
      this.persist();
      this.showToast(`Added ${product.name}`);
    },

    removeFromCart(productId) {
      this.cart = this.cart.filter((c) => c.productId !== productId);
      this.persist();
    },

    updateQuantity(productId, quantity) {
      const item = this.cart.find((c) => c.productId === productId);
      if (!item) {
        return;
      }
      if (quantity <= 0) {
        this.removeFromCart(productId);
        return;
      }
      item.quantity = quantity;
      this.persist();
    },

    clearCart() {
      this.cart = [];
      this.persist();
    },

    toggleLoyalty(key) {
      if (this.loyaltyCards.includes(key)) {
        this.loyaltyCards = this.loyaltyCards.filter((k) => k !== key);
      } else {
        this.loyaltyCards.push(key);
      }
      localStorage.setItem('supermarket-dash-loyalty', JSON.stringify(this.loyaltyCards));
    },

    hasLoyalty(key) {
      return this.loyaltyCards.includes(key);
    },

    getProductName(productId) {
      return this.products.find((p) => p.id === productId)?.name ?? productId;
    },

    getStoreName(storeId) {
      return this.supermarkets.find((s) => s.id === storeId)?.name ?? storeId;
    },

    getStoreColor(storeId) {
      return this.supermarkets.find((s) => s.id === storeId)?.color ?? '#666';
    },

    formatPrice(amount) {
      return SupermarketCompare.formatGBP(amount);
    },

    persist() {
      localStorage.setItem('supermarket-dash-cart', JSON.stringify(this.cart));
    },

    showToast(message) {
      this.toast = message;
      setTimeout(() => {
        this.toast = '';
      }, 2500);
    },

    async copyStoreList(storeId) {
      const map = this.comparison?.savingsMap.find((s) => s.storeId === storeId);
      const supermarket = this.supermarkets.find((s) => s.id === storeId);
      if (!map || !supermarket) {
        return;
      }
      const text = SupermarketBasket.formatListForStore(map.items, supermarket);
      const ok = await SupermarketBasket.copyToClipboard(text);
      this.showToast(ok ? `List copied for ${supermarket.name}` : 'Copy failed');
    },

    openStoreWebsite(storeId) {
      const supermarket = this.supermarkets.find((s) => s.id === storeId);
      const map = this.comparison?.savingsMap.find((s) => s.storeId === storeId);
      if (!supermarket) {
        return;
      }
      if (map?.items?.length) {
        SupermarketBasket.openStoreWithFirstItem(supermarket, map.items);
      } else {
        window.open(supermarket.website, '_blank', 'noopener');
      }
    },

    openBasketGuide(storeId) {
      this.basketModal = storeId;
    },

    closeBasketGuide() {
      this.basketModal = null;
    },
  };
}

if (typeof window !== 'undefined') {
  window.supermarketDash = supermarketDash;
}

