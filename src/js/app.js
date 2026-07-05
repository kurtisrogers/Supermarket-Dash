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
    _searchTimer: null,
    loadStatus: 'loading',
    loadPhase: 'Starting…',
    loadError: '',

    async init() {
      this.loadStatus = 'loading';
      this.loadError = '';
      this.loadPhase = 'Loading supermarkets…';

      try {
        const marketsUrl = this.assetPath('data/supermarkets.json');
        const marketsRes = await fetch(marketsUrl);
        if (!marketsRes.ok) {
          throw new Error(`Failed to load supermarkets (${marketsRes.status})`);
        }
        this.supermarkets = await marketsRes.json();

        const savedCards = localStorage.getItem('supermarket-dash-loyalty');
        if (savedCards) {
          this.loyaltyCards = JSON.parse(savedCards);
        }

        this.loadPhase = 'Loading product catalogue…';
        const productsUrl = this.assetPath('data/products.json');
        const productsRes = await fetch(productsUrl);
        if (!productsRes.ok) {
          throw new Error(`Failed to load products (${productsRes.status}) from ${productsUrl}`);
        }

        const productsData = await productsRes.json();
        this.products = productsData.products ?? productsData;
        this.meta = productsData.meta ?? {};
        this.loadStatus = 'ready';
        this.loadPhase = '';

        const saved = localStorage.getItem('supermarket-dash-cart');
        if (saved) {
          this.cart = JSON.parse(saved);
        }

        this.applySearch(this.searchQuery);
        this.$nextTick(() => this.bindSearchInput());
      } catch (error) {
        this.loadStatus = 'error';
        this.loadError = error instanceof Error ? error.message : 'Failed to load product data';
        this.loadPhase = '';
        console.error('Supermarket Dash init failed:', error);
      }
    },

    async retryLoad() {
      await this.init();
    },

    assetPath(relativePath) {
      return SupermarketPaths.readRuntimeBasePath().replace(/\/?$/, '/') + relativePath.replace(/^\.\//, '');
    },

    applySearch(value) {
      const query = typeof value === 'string' ? value : this.searchQuery;
      this.searchQuery = query;
      this.filteredProducts = SupermarketSearch.filterProducts(this.products, query);
    },

    scheduleSearch(value) {
      if (this._searchTimer) {
        clearTimeout(this._searchTimer);
      }
      this._searchTimer = setTimeout(() => this.applySearch(value), 120);
    },

    onSearchInput(event) {
      this.scheduleSearch(event.target.value ?? '');
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
      const update = () => this.scheduleSearch(input.value ?? '');

      for (const eventName of ['input', 'keyup', 'change', 'compositionend', 'paste']) {
        input.addEventListener(eventName, update, { passive: true });
      }
    },

    get comparison() {
      if (this.loadStatus !== 'ready' || !this.cart.length || !this.products.length) {
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

    get loyaltyStores() {
      return this.supermarkets.filter((store) => store.loyaltyKey);
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
      this.$nextTick(() => {
        const dialog = this.$refs.basketGuideDialog;
        if (dialog?.showModal) {
          dialog.showModal();
        }
      });
    },

    closeBasketGuide() {
      const dialog = this.$refs.basketGuideDialog;
      if (dialog?.open) {
        dialog.close();
      }
      this.basketModal = null;
    },

    get scannerSupported() {
      return SupermarketBarcode.canUseCamera();
    },

    async openScanner() {
      if (this.loadStatus !== 'ready') {
        this.showToast('Wait for products to finish loading');
        return;
      }

      this.scannerOpen = true;
      this.scannerError = '';
      this.scannerStatus = SupermarketBarcode.getScannerSupportMessage();

      await this.$nextTick();

      const dialog = this.$refs.scannerDialog;
      if (dialog?.showModal) {
        dialog.showModal();
      }

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

      const dialog = this.$refs.scannerDialog;
      if (dialog?.open) {
        dialog.close();
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
