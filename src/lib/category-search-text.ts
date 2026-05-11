/**
 * Derive the PIM text query for a leaf category from its menu node.
 *
 * A category node's `url` is a CMS-authored link that may carry a search query
 * (`?text=` / `?q=`) or a category filter (`?filters-category=`); if none, we
 * fall back to the node's slug. Shared by the client `CategoryPage` carousel and
 * the server-rendered SEO product grid so they list the same products.
 */
export function extractSearchText(
  url: string | undefined | null,
  fallback: string,
): string {
  if (!url) return fallback;
  const qsIndex = url.indexOf('?');
  if (qsIndex === -1) return fallback;
  const params = new URLSearchParams(url.slice(qsIndex + 1));
  const text = params.get('text') || params.get('q');
  if (text) return text;
  const category = params.get('filters-category') || params.get('category');
  if (category) return category;
  return fallback;
}
