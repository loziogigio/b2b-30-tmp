/**
 * Server-rendered leaf category page: facet sidebar + product grid + pagination.
 *
 * Mirrors the client-side `/search` layout (left sidebar with facets, right
 * grid of product cards) but as a *pure* server component so the page is fully
 * crawlable on first byte:
 *   • Facets are rendered as `<a href="?filters-X=Y&page=1">` links — picking
 *     a value reloads the page with the new filter and resets pagination.
 *     Already-applied filters render with a strike-through chip that *removes*
 *     them on click. No JS required.
 *   • Pagination is plain anchors — each `?page=N` is its own indexable URL.
 *   • Product cards render image, brand, name and stock chip server-side.
 *
 * The interactive client search overlay still owns the *general* search
 * experience; this component is specifically the leaf-category landing.
 */
import Link from '@components/ui/link';
import { serverFetchPimProducts } from '@/lib/pim/server-fetch';
import {
  PIM_FACET_FIELDS,
  PIM_FACET_LABELS,
  STOCK_STATUS_LABELS,
  BOOLEAN_LABELS,
} from 'vinc-pim';
import { productDetailHref } from '@/lib/seo/product-url';

export const CATEGORY_PRODUCTS_PER_PAGE = 24;

interface CategorySeoProductsProps {
  lang: string;
  /** Absolute-from-root path of this category page, e.g. `/it/categorie/illuminazione/lampadine`. */
  basePath: string;
  /** PIM text query for legacy menu-sourced nodes (ignored when `categoryId` is set). */
  searchText: string;
  /** When backed by a real PIM category, the canonical `category_id`. */
  categoryId?: string;
  /** 1-based page number (already clamped to ≥ 1 by the caller). */
  page: number;
  /** Heading shown above the grid (the category label). */
  heading?: string;
  /** Active filter selections from the URL — keys are PIM field names (e.g.
   *  `brand_id`), values are the selected facet value. */
  selectedFilters?: Record<string, string>;
}

// ===============================
// Field-specific value label resolution
// ===============================
function labelForBucket(field: string, value: string, raw?: string): string {
  if (raw) return raw;
  if (field === 'stock_status' && STOCK_STATUS_LABELS[value])
    return STOCK_STATUS_LABELS[value];
  if (
    (field === 'has_active_promo' || field === 'attribute_is_new_b') &&
    BOOLEAN_LABELS[value]
  )
    return BOOLEAN_LABELS[value];
  return value;
}

function pimImage(p: Record<string, unknown>): string {
  const img = (p.image as { original?: string } | undefined)?.original;
  return (
    img ||
    (p.cover_image_url as string) ||
    ((p.images as Array<{ url?: string }> | undefined)?.[0]?.url ?? '') ||
    ''
  );
}

function pimBrand(p: Record<string, unknown>): string {
  const b = p.brand as { name?: string; label?: string } | string | undefined;
  if (!b) return '';
  if (typeof b === 'string') return b;
  return b.name || b.label || '';
}

// Build a URL preserving the current filters, optionally toggling one and
// resetting/setting the page. `basePath` is `/it/categorie/...`. Returns a
// path-only string ready to drop into `href`.
function buildUrl(
  basePath: string,
  selectedFilters: Record<string, string>,
  override?: { field?: string; value?: string | null; page?: number | null },
): string {
  const params = new URLSearchParams();
  const next = { ...selectedFilters };

  if (override?.field) {
    if (override.value === null || override.value === undefined) {
      delete next[override.field];
    } else {
      next[override.field] = override.value;
    }
  }

  for (const [k, v] of Object.entries(next)) {
    if (v) params.set(`filters-${k}`, v);
  }

  if (override?.page && override.page > 1) {
    params.set('page', String(override.page));
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function CategorySeoProducts({
  lang,
  basePath,
  searchText,
  categoryId,
  page,
  heading,
  selectedFilters = {},
}: CategorySeoProductsProps) {
  const safePage = Math.max(1, Math.floor(page) || 1);

  // Merge category filter with the URL-driven filters. The category filter
  // is non-removable on this page (it scopes the listing); URL filters are.
  const filters: Record<string, any> = { ...selectedFilters };
  if (categoryId) filters.category_ancestors = categoryId;

  const { results, total, facets } = await serverFetchPimProducts({
    text: categoryId ? '' : searchText,
    filters,
    start: (safePage - 1) * CATEGORY_PRODUCTS_PER_PAGE,
    rows: CATEGORY_PRODUCTS_PER_PAGE,
    lang,
    group_variants: true,
    facet_fields: PIM_FACET_FIELDS,
  });

  const products = Array.isArray(results) ? results : [];
  const totalCount = total || 0;
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / CATEGORY_PRODUCTS_PER_PAGE),
  );

  // Render nothing if first page is empty AND no filters are applied — let the
  // client carousel / hero handle the empty state. With filters applied we
  // still want to show the sidebar so users can adjust.
  const hasFilters = Object.keys(selectedFilters).length > 0;
  if (products.length === 0 && safePage === 1 && !hasFilters) return null;

  const pageUrl = (n: number) =>
    buildUrl(basePath, selectedFilters, { page: n });
  const visiblePages = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2);

  // Drop category_ancestors (the scoping filter) from the facet sidebar — it's
  // implicit on this page.
  const facetEntries = Object.entries(facets || {}).filter(
    ([field, buckets]) =>
      field !== 'category_ancestors' &&
      Array.isArray(buckets) &&
      buckets.length > 0,
  );

  return (
    <section
      aria-label={heading || 'Products'}
      className="mx-auto max-w-[1600px] px-4 py-6"
    >
      {heading ? (
        <header className="mb-4 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold text-brand">{heading}</h1>
          {totalCount > 0 ? (
            <span className="text-sm text-gray-500">
              {totalCount} {lang === 'it' ? 'prodotti' : 'products'}
            </span>
          ) : null}
        </header>
      ) : null}

      {/* Selected-filter chips: each is a remove link */}
      {hasFilters ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500">
            {lang === 'it' ? 'Filtri attivi:' : 'Active filters:'}
          </span>
          {Object.entries(selectedFilters).map(([field, value]) => (
            <Link
              key={`${field}-${value}`}
              href={buildUrl(basePath, selectedFilters, {
                field,
                value: null,
                page: null,
              })}
              className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-brand hover:bg-brand/10"
              aria-label={`Rimuovi filtro ${PIM_FACET_LABELS[field] || field}: ${value}`}
            >
              <span className="font-medium">
                {PIM_FACET_LABELS[field] || field}:
              </span>
              <span>{labelForBucket(field, value)}</span>
              <span aria-hidden className="ml-1 text-brand/70">
                ×
              </span>
            </Link>
          ))}
          <Link
            href={basePath}
            className="ml-2 text-brand underline-offset-2 hover:underline"
          >
            {lang === 'it' ? 'Cancella tutti' : 'Clear all'}
          </Link>
        </div>
      ) : null}

      <div className="flex gap-6">
        {/* Sidebar: facet filters */}
        {facetEntries.length > 0 ? (
          <aside
            className="hidden w-64 shrink-0 lg:block"
            aria-label={lang === 'it' ? 'Filtri' : 'Filters'}
          >
            {facetEntries.map(([field, buckets]) => {
              const selected = selectedFilters[field];
              const labelKey = PIM_FACET_LABELS[field] || field;
              return (
                <div
                  key={field}
                  className="mb-6 border-b border-gray-100 pb-4 last:border-none"
                >
                  <h3 className="mb-2 text-sm font-semibold text-brand">
                    {labelKey}
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {buckets.slice(0, 12).map((b) => {
                      const isSelected = selected === b.value;
                      return (
                        <li key={`${field}-${b.value}`}>
                          <Link
                            href={buildUrl(basePath, selectedFilters, {
                              field,
                              value: isSelected ? null : b.value,
                              page: null,
                            })}
                            className={
                              isSelected
                                ? 'flex items-center justify-between gap-2 rounded px-2 py-1 bg-brand/10 text-brand font-medium'
                                : 'flex items-center justify-between gap-2 rounded px-2 py-1 text-gray-700 hover:bg-gray-50'
                            }
                            aria-pressed={isSelected}
                            rel="nofollow"
                          >
                            <span className="line-clamp-1">
                              {isSelected ? '✓ ' : ''}
                              {labelForBucket(field, b.value, b.label)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {b.count}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </aside>
        ) : null}

        {/* Product grid */}
        <div className="min-w-0 flex-1">
          {products.length === 0 ? (
            <p className="py-8 text-sm text-gray-500">
              {lang === 'it'
                ? 'Nessun prodotto trovato con i filtri selezionati.'
                : 'No products match the selected filters.'}
            </p>
          ) : (
            <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((p: Record<string, unknown>, i) => {
                const sku = String((p.sku as string) || (p.id as string) || '');
                const name = String(
                  (p.name as string) || (p.title as string) || sku || 'Product',
                );
                const img = pimImage(p);
                const brand = pimBrand(p);
                const stockStatus = (p.stock_status as string) || '';
                const stockLabel =
                  STOCK_STATUS_LABELS[stockStatus] || stockStatus;
                const productHref =
                  productDetailHref(lang, {
                    slug: p.slug,
                    sku: p.sku || p.id,
                  }) || `/${encodeURIComponent(lang)}`;
                return (
                  <li
                    key={`${sku || 'p'}-${i}`}
                    itemScope
                    itemType="https://schema.org/Product"
                    className="group flex flex-col rounded-lg border border-gray-100 p-3 transition-colors hover:border-brand/40 hover:shadow-sm"
                  >
                    <Link href={productHref} className="flex h-full flex-col">
                      <div className="relative">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={name}
                            loading="lazy"
                            itemProp="image"
                            className="aspect-square w-full object-contain"
                          />
                        ) : (
                          <div className="aspect-square w-full bg-gray-50" />
                        )}
                      </div>
                      {brand ? (
                        <span
                          itemProp="brand"
                          itemScope
                          itemType="https://schema.org/Brand"
                          className="mt-2 text-xs uppercase tracking-wide text-gray-500"
                        >
                          <span itemProp="name">{brand}</span>
                        </span>
                      ) : null}
                      <span
                        itemProp="name"
                        className="mt-1 line-clamp-2 text-sm font-medium text-brand-muted group-hover:text-brand"
                      >
                        {name}
                      </span>
                      {sku ? (
                        <span
                          itemProp="sku"
                          className="mt-1 text-xs text-gray-400"
                        >
                          {sku}
                        </span>
                      ) : null}
                      {stockLabel ? (
                        <span
                          className={
                            stockStatus === 'in_stock'
                              ? 'mt-2 inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
                              : 'mt-2 inline-flex w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600'
                          }
                        >
                          {stockLabel}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}

          {totalPages > 1 ? (
            // Plain anchors — each ?page=N is its own SSR page and that's
            // exactly what we want crawlers to follow.
            <nav
              aria-label="Pagination"
              className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm"
            >
              {safePage > 1 ? (
                <Link
                  href={pageUrl(safePage - 1)}
                  rel="prev"
                  className="rounded border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                >
                  ‹ {lang === 'it' ? 'Prec.' : 'Prev'}
                </Link>
              ) : null}
              {visiblePages.map((n, idx) => (
                <span key={n} className="flex items-center gap-2">
                  {idx > 0 && visiblePages[idx - 1] !== n - 1 ? (
                    <span className="px-1 text-gray-400">…</span>
                  ) : null}
                  {n === safePage ? (
                    <span
                      aria-current="page"
                      className="rounded bg-brand px-3 py-1.5 font-semibold text-white"
                    >
                      {n}
                    </span>
                  ) : (
                    <Link
                      href={pageUrl(n)}
                      className="rounded border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                    >
                      {n}
                    </Link>
                  )}
                </span>
              ))}
              {safePage < totalPages ? (
                <Link
                  href={pageUrl(safePage + 1)}
                  rel="next"
                  className="rounded border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                >
                  {lang === 'it' ? 'Succ.' : 'Next'} ›
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}
