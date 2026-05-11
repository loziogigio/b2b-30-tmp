/**
 * Server-rendered, paginated product grid for **leaf** category pages.
 *
 * Renders the products of a leaf category into the SSR HTML so deep category
 * URLs are crawlable — distinct from the interactive client `/search` overlay.
 * Pagination is plain `<a href="?page=N">` navigation; each page is its own URL.
 *
 * (This is the lean SEO surface — image + name + link to the PDP. Upgrading the
 * items to the full interactive product card / ERP prices, hydrated over this
 * markup, is a follow-up.)
 */
import Link from '@components/ui/link';
import { serverFetchPimProducts } from '@/lib/pim/server-fetch';

export const CATEGORY_PRODUCTS_PER_PAGE = 24;

interface CategorySeoProductsProps {
  lang: string;
  /** Absolute-from-root path of this category page, e.g. `/it/category/illuminazione/lampadine`. */
  basePath: string;
  /** PIM text query for this leaf category (see lib/category-search-text). */
  searchText: string;
  /** 1-based page number (already clamped to ≥ 1 by the caller). */
  page: number;
  /** Heading shown above the grid (the category label). */
  heading?: string;
}

function rawProductImage(p: Record<string, unknown>): string {
  const img = (p.image as { original?: string } | undefined)?.original;
  return (
    img ||
    (p.cover_image_url as string) ||
    ((p.images as Array<{ url?: string }> | undefined)?.[0]?.url ?? '') ||
    ''
  );
}

export default async function CategorySeoProducts({
  lang,
  basePath,
  searchText,
  page,
  heading,
}: CategorySeoProductsProps) {
  const safePage = Math.max(1, Math.floor(page) || 1);

  const { results, total } = await serverFetchPimProducts({
    text: searchText,
    start: (safePage - 1) * CATEGORY_PRODUCTS_PER_PAGE,
    rows: CATEGORY_PRODUCTS_PER_PAGE,
    lang,
    group_variants: true,
  });

  const products = Array.isArray(results) ? results : [];
  const totalCount = total || 0;
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / CATEGORY_PRODUCTS_PER_PAGE),
  );

  // Nothing to show and not a deep page → let the rest of the page stand on its own.
  if (products.length === 0 && safePage === 1) return null;

  const pageUrl = (n: number) => (n <= 1 ? basePath : `${basePath}?page=${n}`);
  const visiblePages = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2);

  return (
    <section
      aria-label={heading || 'Products'}
      className="mx-auto max-w-[1600px] px-4 py-4"
    >
      {heading ? (
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-brand">{heading}</h2>
          {totalCount > 0 ? (
            <span className="text-sm text-gray-500">{totalCount}</span>
          ) : null}
        </div>
      ) : null}

      {products.length === 0 ? (
        <p className="py-8 text-sm text-gray-500">—</p>
      ) : (
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p: Record<string, unknown>, i) => {
            const sku = String((p.sku as string) || (p.id as string) || '');
            const name = String(
              (p.name as string) || (p.title as string) || sku || 'Product',
            );
            const img = rawProductImage(p);
            return (
              <li
                key={`${sku || 'p'}-${i}`}
                className="rounded-lg border border-gray-100 p-2 transition-colors hover:border-brand/40"
              >
                <Link
                  href={`/${lang}/products/${encodeURIComponent(sku)}`}
                  className="block"
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={name}
                      loading="lazy"
                      className="aspect-square w-full object-contain"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-gray-50" />
                  )}
                  <span className="mt-2 block text-sm text-brand-muted line-clamp-2">
                    {name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {totalPages > 1 ? (
        // Plain anchors — paginating is a full navigation (each ?page=N is its
        // own SSR page) and that's exactly what we want crawlers to follow.
        <nav
          aria-label="Pagination"
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm"
        >
          {safePage > 1 ? (
            <a
              href={pageUrl(safePage - 1)}
              rel="prev"
              className="rounded border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
            >
              ‹ Prev
            </a>
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
                <a
                  href={pageUrl(n)}
                  className="rounded border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                >
                  {n}
                </a>
              )}
            </span>
          ))}
          {safePage < totalPages ? (
            <a
              href={pageUrl(safePage + 1)}
              rel="next"
              className="rounded border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
            >
              Next ›
            </a>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
