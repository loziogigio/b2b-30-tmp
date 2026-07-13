/**
 * Product detail routes are flat: `/{lang}/{localized-product-slug}`.
 *
 * Search responses can expose `slug` either as the already-localized string or
 * as the PIM multilingual map. Products without a slug remain reachable by
 * SKU, matching the sitemap and resolve-product contracts.
 */

export interface ProductRouteIdentity {
  slug?: unknown;
  sku?: unknown;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Pick the slug for the requested locale without leaking a different locale. */
export function localizedProductSlug(
  slug: unknown,
  lang: string,
): string | null {
  const direct = nonEmptyString(slug);
  if (direct) return direct;

  if (!slug || typeof slug !== 'object' || Array.isArray(slug)) return null;

  const localized = slug as Record<string, unknown>;
  const normalizedLang = lang.trim().toLowerCase();
  const languageOnly = normalizedLang.split('-')[0];

  return (
    nonEmptyString(localized[lang]) ||
    nonEmptyString(localized[normalizedLang]) ||
    nonEmptyString(localized[languageOnly])
  );
}

/** Canonical, path-only href for a product detail page. */
export function productDetailHref(
  lang: string,
  product: ProductRouteIdentity,
): string | null {
  const routeSegment =
    localizedProductSlug(product.slug, lang) || nonEmptyString(product.sku);
  const locale = nonEmptyString(lang);
  if (!locale || !routeSegment) return null;

  return `/${encodeURIComponent(locale)}/${encodeURIComponent(routeSegment)}`;
}

/** Absolute equivalent of {@link productDetailHref}, for metadata and JSON-LD. */
export function absoluteProductDetailUrl(
  siteUrl: string,
  lang: string,
  product: ProductRouteIdentity,
): string | null {
  const href = productDetailHref(lang, product);
  if (!href) return null;
  return `${siteUrl.replace(/\/+$/, '')}${href}`;
}
