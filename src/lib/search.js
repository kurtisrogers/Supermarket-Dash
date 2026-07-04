/**
 * Product search/filter logic (shared by app + tests).
 */

export function filterProducts(products, query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return products.slice(0, limit);
  }

  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q) ||
      (product.searchTerms?.some((term) => term.toLowerCase().includes(q)) ?? false),
  );
}
