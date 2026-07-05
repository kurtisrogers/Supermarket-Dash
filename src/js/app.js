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
    loadStatus: 'loading',
    loadError: '',
    _searchBound: false,

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
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('supermarketDash', supermarketDash);
});
