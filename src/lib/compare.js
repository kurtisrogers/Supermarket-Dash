/**
 * Price comparison and multi-store savings optimizer.
 */

export function formatGBP(amount) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

export function hasLoyaltyCard(supermarket, loyaltyCards) {
  return Boolean(supermarket.loyaltyKey && loyaltyCards.includes(supermarket.loyaltyKey));
}

export function getItemPrice(product, storeId, supermarkets, loyaltyCards) {
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

export function buildSavingsMap(itemAssignments, supermarkets) {
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

export function compareList(cartItems, products, supermarkets, loyaltyCards) {
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
