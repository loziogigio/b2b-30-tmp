import type { FC } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Alert from '@components/ui/alert';
import Button from '@components/ui/button';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import { getThemedComponent } from '@/lib/theme/registry';
import cn from 'classnames';
import { LIMITS } from '@framework/utils/limits';
import { Product } from '@framework/types';
import { useTranslation } from 'src/app/i18n/client';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  usePimProductListInfiniteQuery,
  fetchPimProductList,
} from '@framework/product/get-pim-product';
// ProductCardB2B is the default; the themed registry swaps in the time
// variant (TimeProductCard) when tenant.b2bTheme === 'time'.
const ThemedProductCard = getThemedComponent('ProductCard');
import ProductRowB2B from './product-rows/product-row-b2b';
import { useMemo, useEffect, useRef, useState } from 'react';
import {
  IoGridOutline,
  IoListOutline,
  IoInformationCircleOutline,
} from 'react-icons/io5';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import {
  canLoadSpecialSource,
  fetchSpecialSourceSkuPage,
  getSpecialSource,
  parsePimFiltersFromUrlParams,
} from '@/components/search/special-source';
import { useUI } from '@contexts/ui.context';
import React from 'react';

export type ProductCardComponentType = React.ComponentType<{
  product: Product & { variantCount?: number };
  lang: string;
  priceData?: ErpPriceData;
  className?: string;
  forceShowReminderToggle?: boolean;
}>;

interface ProductSearchProps {
  lang: string;
  className?: string;
  collectionSlug?: string; // Filter products by collection
  /** Override the card component used in grid view */
  CardComponent?: ProductCardComponentType;
  /** Override grid layout classes */
  gridClassName?: string;
  /** Class name forwarded to each card */
  cardClassName?: string;
}

const DEFAULT_GRID_CLASSES =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-4 gap-2 md:gap-4 2xl:gap-5';

export const ProductB2BSearch: FC<ProductSearchProps> = ({
  className = '',
  lang,
  collectionSlug,
  CardComponent = ThemedProductCard,
  gridClassName,
  cardClassName,
}) => {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();

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

  const urlParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value: string, key: string) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  // Transform URL params to PIM API format
  const pimParams = useMemo(() => {
    const filters = parsePimFiltersFromUrlParams(urlParams, {
      collectionSlug,
    });

    return {
      lang,
      text: urlParams.text || urlParams.q || '',
      per_page: LIMITS.PRODUCTS_LIMITS,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }, [urlParams, lang, collectionSlug]);

  const specialSource = getSpecialSource(searchParams.get('source'));
  const period = (searchParams.get('period') || '7d').toLowerCase();
  const pageSizeParam = Math.min(
    100,
    Math.max(1, Number(searchParams.get('page_size') || 24)),
  );

  const isSpecialSource = !!specialSource;
  const canLoadCurrentSpecialSource = canLoadSpecialSource(
    specialSource,
    isAuthorized,
  );

  // Blank search: no text, no filters, no special source — new empty tab
  const isBlankSearch =
    !isSpecialSource &&
    !pimParams.text &&
    !pimParams.filters &&
    !collectionSlug;

  // Extract URL filters for likes/trending queries
  const urlFiltersForSpecialQuery = useMemo(() => {
    return parsePimFiltersFromUrlParams(urlParams);
  }, [urlParams]);

  const specialSourceQuery = useInfiniteQuery({
    queryKey: [
      'search-special',
      specialSource,
      period,
      pageSizeParam,
      lang,
      urlFiltersForSpecialQuery,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      if (!specialSource) return { items: [], nextPage: null };
      const page = Number(pageParam);
      const skuPage = await fetchSpecialSourceSkuPage({
        source: specialSource,
        period,
        page,
        pageSize: pageSizeParam,
      });
      if (!skuPage.skus.length) return { items: [], nextPage: null };
      const result = await fetchPimProductList({
        lang,
        filters: { sku: skuPage.skus, ...urlFiltersForSpecialQuery },
        rows: skuPage.skus.length,
      });
      const nextPage = skuPage.hasNext ? page + 1 : null;
      return { items: result.items, nextPage };
    },
    enabled: isSpecialSource && canLoadCurrentSpecialSource,
    getNextPageParam: (lastPage) => lastPage?.nextPage ?? undefined,
    initialPageParam: 1,
  });

  const baseQuery = usePimProductListInfiniteQuery(pimParams, {
    groupByParent: true,
    enabled: !isBlankSearch && !isSpecialSource,
  });

  const data = isBlankSearch
    ? undefined
    : isSpecialSource
      ? specialSourceQuery.data
      : baseQuery.data;
  const error = isSpecialSource
    ? (specialSourceQuery.error as any)
    : baseQuery.error;
  const isLoading = isSpecialSource
    ? specialSourceQuery.isFetching
    : baseQuery.isFetching;
  const fetchNextPage = isSpecialSource
    ? specialSourceQuery.fetchNextPage
    : baseQuery.fetchNextPage;
  const loadingMore = isSpecialSource
    ? specialSourceQuery.isFetchingNextPage
    : baseQuery.isFetchingNextPage;
  const hasNextPage = isSpecialSource
    ? !!specialSourceQuery.hasNextPage
    : baseQuery.hasNextPage;

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

      {isBlankSearch ? (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
          <IoGridOutline className="w-12 h-12 mb-4 text-gray-300" />
          <p className="text-lg font-medium">
            {t('text-search-empty-tab', {
              defaultValue: 'Cerca prodotti per iniziare',
            })}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            isList
              ? 'grid grid-cols-1 gap-3'
              : (gridClassName ?? DEFAULT_GRID_CLASSES),
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
                // Collapse single-variant groups onto the variant so the card
                // renders the variant's SKU/pricing directly. Multi-variant
                // groups stay on the parent (the card opens the variants
                // quick view).
                const vars = Array.isArray(p.variations) ? p.variations : [];
                const isSingleVariant =
                  vars.length === 1 &&
                  (p.variantCount === 1 || !p.variantCount);
                const target = isSingleVariant
                  ? { ...vars[0], variantCount: 1 }
                  : p;

                if (isList) {
                  return (
                    <ProductRowB2B
                      key={`row-${target.id}`}
                      lang={lang}
                      product={target}
                      forceShowReminderToggle={specialSource === 'reminders'}
                    />
                  );
                }

                return (
                  <CardComponent
                    key={`card-${target.id}`}
                    product={target}
                    lang={lang}
                    forceShowReminderToggle={specialSource === 'reminders'}
                    className={cardClassName}
                  />
                );
              }),
            )
          )}
        </div>
      )}

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
