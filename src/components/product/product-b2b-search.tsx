import type { FC } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Alert from '@components/ui/alert';
import Button from '@components/ui/button';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import cn from 'classnames';
import { LIMITS } from '@framework/utils/limits';
import { Product } from '@framework/types';
import { useTranslation } from 'src/app/i18n/client';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  usePimProductListInfiniteQuery,
  fetchPimProductList,
} from '@framework/product/get-pim-product';
import ProductCardB2B from './product-cards/product-card-b2b';
import ProductRowB2B from './product-rows/product-row-b2b';
import { fetchErpPrices } from '@framework/erp/prices';
import { useMemo, useEffect, useRef, useState } from 'react';
import { ERP_STATIC } from '@framework/utils/static';
import {
  IoGridOutline,
  IoListOutline,
  IoInformationCircleOutline,
} from 'react-icons/io5';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { useUI } from '@contexts/ui.context';
import {
  getUserLikes as apiGetUserLikes,
  getTrendingProductsPage as apiGetTrendingPage,
} from '@framework/likes';
import React from 'react';

interface ProductSearchProps {
  lang: string;
  className?: string;
  collectionSlug?: string; // Filter products by collection
}

export const ProductB2BSearch: FC<ProductSearchProps> = ({
  className = '',
  lang,
  collectionSlug,
}) => {
  const { t } = useTranslation(lang, 'common');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // view from query
  // View mode persistence (URL 'view' param OR localStorage fallback)
  // Default to grid on first SSR render; sync from URL/LS after mount
  const [view, setViewState] = useState<'grid' | 'list'>('grid');

  const isList = view === 'list';
  const setView = (next: 'grid' | 'list') => {
    setViewState(next);
    try {
      localStorage.setItem('search-view', next);
    } catch {}
    const params = new URLSearchParams(searchParams as any);
    // keep URL stable; optionally persist 'view' explicitly
    if (next === 'grid') params.delete('view');
    else params.set('view', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // After mount or when URL changes, sync view from URL or fallback to LS
  useEffect(() => {
    const fromUrl = (searchParams.get('view') || '').toLowerCase();
    let next: 'grid' | 'list' | null = null;
    if (fromUrl === 'grid' || fromUrl === 'list')
      next = fromUrl as 'grid' | 'list';
    if (!next) {
      try {
        const ls = localStorage.getItem('search-view');
        if (ls === 'grid' || ls === 'list') next = ls as 'grid' | 'list';
      } catch {}
    }
    if (next && next !== view) setViewState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Build params for PIM API
  const urlParams: Record<string, string> = {};
  searchParams.forEach((v, k) => (urlParams[k] = v));

  // Transform URL params to PIM API format
  const pimParams = useMemo(() => {
    const filters: Record<string, any> = {};

    // Extract filters from URL params (filters-xxx -> filters.xxx)
    for (const [key, value] of Object.entries(urlParams)) {
      if (key.startsWith('filters-')) {
        const filterKey = key.replace('filters-', '');
        // Support semicolon-separated values
        filters[filterKey] =
          typeof value === 'string' && value.includes(';')
            ? value.split(';')
            : value;
      }
    }

    // Add collection filter if provided via prop
    if (collectionSlug) {
      filters.collection_slugs = collectionSlug;
    }

    return {
      lang,
      text: urlParams.text || urlParams.q || '',
      per_page: LIMITS.PRODUCTS_LIMITS,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }, [urlParams, lang, collectionSlug]);

  const source = (searchParams.get('source') || '').toLowerCase();
  const period = (searchParams.get('period') || '7d').toLowerCase();
  const pageSizeParam = Math.min(
    100,
    Math.max(1, Number(searchParams.get('page_size') || 24)),
  );

  const likesOrTrending = source === 'likes' || source === 'trending';

  // Extract URL filters for likes/trending queries
  const urlFiltersForSpecialQuery = useMemo(() => {
    const filters: Record<string, any> = {};
    for (const [key, value] of Object.entries(urlParams)) {
      if (key.startsWith('filters-')) {
        const filterKey = key.replace('filters-', '');
        filters[filterKey] =
          typeof value === 'string' && value.includes(';')
            ? value.split(';')
            : value;
      }
    }
    return filters;
  }, [urlParams]);

  const likesTrendingQuery = useInfiniteQuery({
    queryKey: [
      'search-special',
      source,
      period,
      pageSizeParam,
      lang,
      urlFiltersForSpecialQuery,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      if (source === 'likes') {
        const res = await apiGetUserLikes(pageParam, pageSizeParam);
        const skus = (res?.likes || []).map((l: any) => l.sku).filter(Boolean);
        if (!skus.length) {
          return { items: [], nextPage: null };
        }
        // Use PIM search with SKU filter + URL filters
        const result = await fetchPimProductList({
          lang,
          filters: { sku: skus, ...urlFiltersForSpecialQuery },
          rows: skus.length,
        });
        const nextPage = res?.has_next ? pageParam + 1 : null;
        return { items: result.items, nextPage };
      }
      // trending: paginated response
      const trendingPage = await apiGetTrendingPage(
        period,
        pageParam,
        pageSizeParam,
        false,
      );
      const skus = (trendingPage?.items || [])
        .map((x: any) => x.sku)
        .filter(Boolean);
      if (!skus.length) return { items: [], nextPage: null };
      // Use PIM search with SKU filter + URL filters
      const result = await fetchPimProductList({
        lang,
        filters: { sku: skus, ...urlFiltersForSpecialQuery },
        rows: skus.length,
      });
      const nextPage = trendingPage?.has_next ? pageParam + 1 : null;
      return { items: result.items, nextPage };
    },
    enabled: likesOrTrending,
    getNextPageParam: (lastPage) => lastPage?.nextPage ?? undefined,
    initialPageParam: 1,
  });

  const baseQuery = usePimProductListInfiniteQuery(pimParams, {
    groupByParent: true,
  });

  const data = likesOrTrending ? likesTrendingQuery.data : baseQuery.data;
  const error = likesOrTrending
    ? (likesTrendingQuery.error as any)
    : baseQuery.error;
  const isLoading = likesOrTrending
    ? likesTrendingQuery.isFetching
    : baseQuery.isFetching;
  const fetchNextPage = likesOrTrending
    ? likesTrendingQuery.fetchNextPage
    : baseQuery.fetchNextPage;
  const loadingMore = likesOrTrending
    ? likesTrendingQuery.isFetchingNextPage
    : baseQuery.isFetchingNextPage;
  const hasNextPage = likesOrTrending
    ? !!likesTrendingQuery.hasNextPage
    : baseQuery.hasNextPage;

  // ⬇️ Include ALL variant ids so list view has prices when expanded
  // --- ERP prices: fetch only for newly loaded page and merge (only when authorized)
  const [erpPricesMap, setErpPricesMap] = useState<
    Record<string, ErpPriceData>
  >({});
  const fetchedCodesRef = useRef<Set<string>>(new Set());
  const { isAuthorized } = useUI();

  // Reset ERP cache when search signature changes
  const searchSignature = useMemo(() => {
    const base = JSON.stringify(pimParams);
    if (likesOrTrending) {
      return source === 'likes'
        ? `likes:${pageSizeParam}`
        : `trending:${period}:${pageSizeParam}`;
    }
    return `base:${base}`;
  }, [likesOrTrending, source, period, pageSizeParam, pimParams]);

  const prevSig = useRef<string>('');
  useEffect(() => {
    if (prevSig.current !== searchSignature) {
      prevSig.current = searchSignature;
      setErpPricesMap({});
      fetchedCodesRef.current = new Set();
    }
  }, [searchSignature]);

  const lastItems: Product[] = useMemo(() => {
    const pages = (data as any)?.pages;
    if (!pages?.length) return [];
    const last = pages[pages.length - 1];
    return last?.items ?? [];
  }, [data]);

  const newCodes = useMemo(() => {
    // Only fetch ERP prices for single-variant products (variantCount <= 1 or undefined)
    const singleVariantProducts = (lastItems as any[]).filter(
      (p) => !p?.variantCount || p.variantCount <= 1,
    );
    const codes = singleVariantProducts.flatMap((p) => {
      const vars = Array.isArray(p?.variations) ? p.variations : [];
      return vars.length > 0
        ? vars.map((v: any) => String(v?.id ?? ''))
        : [String(p?.id ?? '')];
    });
    return codes.filter((c) => c && !fetchedCodesRef.current.has(c));
  }, [lastItems]);

  useEffect(() => {
    if (!isAuthorized || !newCodes.length) return;
    const payload = { entity_codes: newCodes, ...ERP_STATIC } as any;
    let mounted = true;
    fetchErpPrices(payload)
      .then((res) => {
        if (!mounted || !res) return;
        setErpPricesMap((prev) => ({ ...prev, ...(res as any) }));
        for (const c of newCodes) fetchedCodesRef.current.add(c);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [newCodes]);

  const getPrice = (id: string | number) => erpPricesMap[String(id)];

  // Infinite scroll: auto-load more when user scrolls near bottom
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Auto-load when sentinel is visible, has next page, and not already loading
        if (
          entry.isIntersecting &&
          hasNextPage &&
          !loadingMore &&
          !isLoadingMoreRef.current
        ) {
          isLoadingMoreRef.current = true;
          fetchNextPage().finally(() => {
            isLoadingMoreRef.current = false;
          });
        }
      },
      { rootMargin: '200px' }, // Start loading 200px before reaching the sentinel
    );

    const sentinel = loadMoreRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [hasNextPage, loadingMore, fetchNextPage]);

  return (
    <>
      {/* view toggle */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={() => setView('grid')}
          className={cn(
            'h-9 w-9 flex items-center justify-center rounded border',
            !isList
              ? 'bg-brand text-white border-brand'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
          )}
          aria-label={t('grid', { defaultValue: 'Grid' })}
          aria-pressed={!isList}
          title={t('grid', { defaultValue: 'Grid' })}
        >
          <IoGridOutline />
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={cn(
            'h-9 w-9 flex items-center justify-center rounded border',
            isList
              ? 'bg-brand text-white border-brand'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
          )}
          aria-label={t('list', { defaultValue: 'List' })}
          aria-pressed={isList}
          title={t('list', { defaultValue: 'List' })}
        >
          <IoListOutline />
        </button>
      </div>

      <div
        className={cn(
          isList
            ? 'grid grid-cols-1 gap-3'
            : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-4 gap-2 md:gap-4 2xl:gap-5',
          className,
        )}
      >
        {error ? (
          <div className="col-span-full">
            <Alert message={error?.message} />
          </div>
        ) : isLoading && !data?.pages?.length ? (
          Array.from({ length: 30 }).map((_, idx) => (
            <ProductCardLoader
              key={`product--key-${idx}`}
              uniqueKey={`product--key-${idx}`}
            />
          ))
        ) : (
          data?.pages?.map((page: any) =>
            page?.items?.map((p: any) => {
              // With grouped search: p has variantCount attached
              // Without grouped search: p may have variations array
              // For single-variant products (variantCount === 1 OR variations.length === 1), use variant's data
              const vars = Array.isArray(p.variations) ? p.variations : [];
              const isSingleVariant =
                vars.length === 1 && (p.variantCount === 1 || !p.variantCount);
              const target = isSingleVariant
                ? { ...vars[0], variantCount: 1 }
                : p;
              // Skip ERP price for grouped products with multiple variants
              const hasMultipleVariants =
                target.variantCount && target.variantCount > 1;
              // For single-variant products, use the variant's ID for price lookup (ERP prices are fetched by variant ID)
              const priceId = hasMultipleVariants
                ? null
                : vars.length === 1
                  ? vars[0]?.id
                  : target.id;
              const priceData = priceId ? getPrice(priceId) : undefined;

              if (isList) {
                // list: always render parent row; variants appear in the row itself
                return (
                  <ProductRowB2B
                    key={`row-${target.id}`}
                    lang={lang}
                    product={target}
                    getPrice={getPrice}
                    priceData={priceData}
                  />
                );
              }

              return (
                <ProductCardB2B
                  key={`card-${target.id}`}
                  product={target}
                  lang={lang}
                  priceData={priceData}
                />
              );
            }),
          )
        )}
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={loadMoreRef} className="h-1" />

      {hasNextPage && (
        <div className="pt-8 text-center xl:pt-10">
          <Button
            loading={loadingMore}
            disabled={loadingMore}
            onClick={() => fetchNextPage()}
          >
            {t('button-load-more')}
          </Button>
        </div>
      )}

      {/* End of results message - only show if we loaded multiple pages */}
      {!hasNextPage && data?.pages && data.pages.length > 1 && (
        <div className="flex items-start gap-3 p-4 my-6 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
          <IoInformationCircleOutline className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              {t('text-all-products-loaded', {
                defaultValue: 'Tutti i prodotti sono stati caricati',
              })}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {t('text-all-available-results-shown', {
                defaultValue:
                  'Hai visualizzato tutti i risultati disponibili per questa ricerca',
              })}
            </p>
          </div>
        </div>
      )}

      {/* No results message */}
      {!isLoading &&
        data?.pages &&
        data.pages.length > 0 &&
        data.pages.every((page: any) => !page?.items?.length) && (
          <div className="flex items-start gap-3 p-5 my-6 bg-amber-50 border border-amber-200 rounded-lg max-w-2xl mx-auto">
            <IoInformationCircleOutline className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-base font-semibold text-amber-900 mb-2">
                {t('text-no-products-found', {
                  defaultValue: 'Nessun prodotto trovato',
                })}
              </p>
              <p className="text-sm text-amber-800 mb-2">
                {t('text-try-different-filters', {
                  defaultValue: 'Prova a modificare i filtri di ricerca',
                })}
              </p>
              <ul className="text-xs text-amber-700 space-y-1 ml-1">
                <li>
                  •{' '}
                  {t('text-search-suggestion-1', {
                    defaultValue:
                      'Prova con parole chiave diverse o più generiche',
                  })}
                </li>
                <li>
                  •{' '}
                  {t('text-search-suggestion-2', {
                    defaultValue:
                      'Rimuovi alcuni filtri per ampliare i risultati',
                  })}
                </li>
                <li>
                  •{' '}
                  {t('text-search-suggestion-3', {
                    defaultValue:
                      "Verifica l'ortografia dei termini di ricerca",
                  })}
                </li>
              </ul>
            </div>
          </div>
        )}
    </>
  );
};
