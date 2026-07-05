/* Supermarket Dash — bundled app */
/**
 * Resolve asset paths for GitHub Pages project sites (e.g. /Supermarket-Dash/).
 */

function resolveBasePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  if (pathname.endsWith('/')) {
    return pathname;
  }

  const lastSegment = pathname.split('/').pop() ?? '';
  if (lastSegment.includes('.')) {
    return pathname.slice(0, pathname.lastIndexOf('/') + 1);
  }

  return `${pathname}/`;
}

function resolveAssetPath(relativePath, pathname = '/') {
  const base = resolveBasePath(pathname);
  const cleaned = relativePath.replace(/^\.\//, '');
  if (base === '/') {
    return `/${cleaned}`;
  }
  return `${base}${cleaned}`;
}

function readRuntimeBasePath() {
  if (typeof window === 'undefined') {
    return '/';
  }
  if (window.__APP_BASE__) {
    return window.__APP_BASE__;
  }
  return resolveBasePath(window.location.pathname);
}
/**
 * Product search/filter logic (shared by app + tests).
 */

function normalizeBarcode(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeSku(value) {
  return String(value ?? '').trim().toLowerCase();
}

function findProductByBarcode(products, barcode) {
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

function findProductsBySku(products, sku) {
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

function filterProducts(products, query, limit = 12) {
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

  const textMatches = products.filter((product) => matchesText(product, trimmed));
  return textMatches.slice(0, limit);
}

function isBarcodeQuery(query) {
  const digits = normalizeBarcode(query);
  return digits.length >= 8;
}

function isSkuQuery(query) {
  const trimmed = query.trim();
  return /^[a-z0-9-]{4,}$/i.test(trimmed) && /\d/.test(trimmed);
}

/**
 * Barcode scanning helpers for mobile browsers.
 */

import { findProductByBarcode, normalizeBarcode } from './search.js';

const HTML5_QRCODE_URL = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

function canUseBarcodeDetector() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

function canUseCamera() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

async function loadHtml5Qrcode() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (window.Html5Qrcode) {
    return window.Html5Qrcode;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HTML5_QRCODE_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load barcode scanner library'));
    document.head.appendChild(script);
  });

  return window.Html5Qrcode ?? null;
}

function resolveScannedProduct(products, barcode) {
  return findProductByBarcode(products, barcode);
}

function stopMediaStream(stream) {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

async function startNativeBarcodeScanner(videoElement, onDetect, onError) {
  if (!canUseBarcodeDetector()) {
    throw new Error('Native barcode scanning is not supported on this device');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  });

  videoElement.srcObject = stream;
  videoElement.setAttribute('playsinline', 'true');
  await videoElement.play();

  const detector = new BarcodeDetector({ formats: BARCODE_FORMATS });
  let active = true;

  const scan = async () => {
    if (!active) {
      return;
    }

    try {
      const results = await detector.detect(videoElement);
      if (results.length > 0) {
        active = false;
        stopMediaStream(stream);
        videoElement.srcObject = null;
        onDetect(normalizeBarcode(results[0].rawValue));
        return;
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Barcode scan failed');
      active = false;
      stopMediaStream(stream);
      videoElement.srcObject = null;
      return;
    }

    requestAnimationFrame(scan);
  };

  scan();

  return () => {
    active = false;
    stopMediaStream(stream);
    videoElement.srcObject = null;
  };
}

async function startHtml5BarcodeScanner(containerId, onDetect, onError) {
  const Html5Qrcode = await loadHtml5Qrcode();
  if (!Html5Qrcode) {
    throw new Error('Barcode scanner library unavailable');
  }

  const scanner = new Html5Qrcode(containerId);
  let stopped = false;

  await scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 280, height: 140 }, aspectRatio: 1.7777778 },
    (decodedText) => {
      if (stopped) {
        return;
      }
      stopped = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .finally(() => onDetect(normalizeBarcode(decodedText)));
    },
    () => {},
  );

  return async () => {
    if (stopped) {
      return;
    }
    stopped = true;
    await scanner.stop();
    scanner.clear();
  };
}

async function startBarcodeScanner({ videoElement, containerId, onDetect, onError }) {
  if (canUseBarcodeDetector() && videoElement) {
    try {
      return await startNativeBarcodeScanner(videoElement, onDetect, onError);
    } catch (error) {
      if (!containerId) {
        throw error;
      }
    }
  }

  if (containerId) {
    return startHtml5BarcodeScanner(containerId, onDetect, onError);
  }

  throw new Error('No supported barcode scanner available');
}

function getScannerSupportMessage() {
  if (canUseCamera()) {
    return 'Point your camera at the product barcode. You can also type a barcode or SKU into search.';
  }
  return 'Camera access is unavailable. Type a barcode or SKU into the search box instead.';
}

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

/**
 * Basket helpers — copy lists and open supermarket search pages.
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
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
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
  if (!items.length || typeof window === 'undefined') {
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


window.SupermarketPaths = { resolveBasePath, resolveAssetPath, readRuntimeBasePath };
window.SupermarketSearch = {
  filterProducts,
  findProductByBarcode,
  findProductsBySku,
  normalizeBarcode,
  normalizeSku,
  isBarcodeQuery,
  isSkuQuery,
};
window.SupermarketBarcode = {
  canUseBarcodeDetector,
  canUseCamera,
  loadHtml5Qrcode,
  resolveScannedProduct,
  startBarcodeScanner,
  getScannerSupportMessage,
};
window.SupermarketCompare = { compareList, formatGBP, getItemPrice, buildSavingsMap, hasLoyaltyCard };
window.SupermarketBasket = {
  buildSearchUrl,
  formatListForStore,
  getBasketStrategy,
  copyToClipboard,
  openStoreWithFirstItem,
  getQuickSearchLinks,
};

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
    filteredProducts: [],
    toast: '',
    basketModal: null,
    scannerOpen: false,
    scannerError: '',
    scannerStatus: '',
    _searchBound: false,
    _stopScanner: null,
    loadStatus: 'loading',
    loadError: '',

    async init() {
      this.loadStatus = 'loading';
      this.loadError = '';

      try {
        const productsUrl = this.assetPath('data/products.json');
        const marketsUrl = this.assetPath('data/supermarkets.json');

        const [productsRes, marketsRes] = await Promise.all([fetch(productsUrl), fetch(marketsUrl)]);

        if (!productsRes.ok) {
          throw new Error(`Failed to load products (${productsRes.status}) from ${productsUrl}`);
        }
        if (!marketsRes.ok) {
          throw new Error(`Failed to load supermarkets (${marketsRes.status}) from ${marketsUrl}`);
        }

        const productsData = await productsRes.json();
        this.products = productsData.products ?? productsData;
        this.meta = productsData.meta ?? {};
        this.supermarkets = await marketsRes.json();
        this.loadStatus = 'ready';

        const saved = localStorage.getItem('supermarket-dash-cart');
        const savedCards = localStorage.getItem('supermarket-dash-loyalty');
        if (saved) {
          this.cart = JSON.parse(saved);
        }
        if (savedCards) {
          this.loyaltyCards = JSON.parse(savedCards);
        }

        this.applySearch(this.searchQuery);
        this.$nextTick(() => this.bindSearchInput());
      } catch (error) {
        this.loadStatus = 'error';
        this.loadError = error instanceof Error ? error.message : 'Failed to load product data';
        console.error('Supermarket Dash init failed:', error);
      }
    },

    assetPath(relativePath) {
      return SupermarketPaths.readRuntimeBasePath().replace(/\/?$/, '/') + relativePath.replace(/^\.\//, '');
    },

    applySearch(value) {
      const query = typeof value === 'string' ? value : this.searchQuery;
      this.searchQuery = query;
      this.filteredProducts = SupermarketSearch.filterProducts(this.products, query);
    },

    onSearchInput(event) {
      this.applySearch(event.target.value ?? '');
    },

    bindSearchInput() {
      if (this._searchBound) {
        return;
      }

      const input = this.$refs.searchInput;
      if (!input) {
        return;
      }

      this._searchBound = true;
      const update = () => this.applySearch(input.value ?? '');

      for (const eventName of ['input', 'keyup', 'change', 'compositionend', 'paste']) {
        input.addEventListener(eventName, update, { passive: true });
      }
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
        this.loyaltyCards = [...this.loyaltyCards, key];
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

    get scannerSupported() {
      return SupermarketBarcode.canUseCamera();
    },

    async openScanner() {
      this.scannerOpen = true;
      this.scannerError = '';
      this.scannerStatus = SupermarketBarcode.getScannerSupportMessage();

      await this.$nextTick();

      try {
        this._stopScanner = await SupermarketBarcode.startBarcodeScanner({
          videoElement: this.$refs.scannerVideo,
          containerId: 'barcode-scanner-region',
          onDetect: (barcode) => this.handleBarcodeDetected(barcode),
          onError: (message) => {
            this.scannerError = message;
          },
        });
        this.scannerStatus = 'Scanning… hold the barcode steady in view.';
      } catch (error) {
        this.scannerError = error instanceof Error ? error.message : 'Unable to start camera scanner';
      }
    },

    async closeScanner() {
      if (this._stopScanner) {
        await this._stopScanner();
        this._stopScanner = null;
      }
      this.scannerOpen = false;
      this.scannerError = '';
      this.scannerStatus = '';
    },

    async handleBarcodeDetected(barcode) {
      const product = SupermarketBarcode.resolveScannedProduct(this.products, barcode);
      await this.closeScanner();

      if (product) {
        this.applySearch(barcode);
        this.addToCart(product);
        this.showToast(`Found ${product.name}`);
        return;
      }

      this.applySearch(barcode);
      this.showToast(`No product found for barcode ${barcode}`);
    },
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('supermarketDash', supermarketDash);
});

