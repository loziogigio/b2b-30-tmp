'use client';

import type { FC } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LIMITS } from '@framework/utils/limits';
import { Product } from '@framework/types';
import { useTranslation } from 'src/app/i18n/client';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  usePimProductListInfiniteQuery,
  fetchPimProductList,
} from '@framework/product/get-pim-product';
import { fetchErpPrices } from '@framework/erp/prices';
import { useMemo, useEffect, useRef, useState } from 'react';
import { ERP_STATIC } from '@framework/utils/static';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { useUI } from '@contexts/ui.context';
import {
  getUserLikes as apiGetUserLikes,
  getTrendingProductsPage as apiGetTrendingPage,
} from '@framework/likes';
import { getUserReminders as apiGetUserReminders } from '@framework/reminders';
import React from 'react';
import TimeSearchCard from './time-search-card';
import TimeSearchRow from './time-search-row';
import { IoGridOutline, IoListOutline } from 'react-icons/io5';
import { IoChevronDown } from 'react-icons/io5';

interface TimeProductSearchProps {
  lang: string;
  className?: string;
  collectionSlug?: string;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const SORT_OPTIONS = [
  {
    name: 'text-sorting-options',
    value: 'relevance',
    defaultLabel: 'Rilevanza',
  },
  {
    name: 'text-lowest-price',
    value: 'lowest',
    defaultLabel: 'Prezzo crescente',
  },
  {
    name: 'text-highest-price',
    value: 'highest',
    defaultLabel: 'Prezzo decrescente',
  },
  {
    name: 'text-new-arrival',
    value: 'new-arrival',
    defaultLabel: 'Nuovi arrivi',
  },
  {
    name: 'text-most-order',
    value: 'most-order',
    defaultLabel: 'Più ordinati',
  },
];

export const TimeProductSearch: FC<TimeProductSearchProps> = ({
  lang,
  collectionSlug,
  sidebarOpen = true,
  onToggleSidebar,
}) => {
  const { t } = useTranslation(lang, 'common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // View mode persistence
  const [view, setViewState] = useState<'grid' | 'list'>('grid');
  const isList = view === 'list';
  const setView = (next: 'grid' | 'list') => {
    setViewState(next);
    try {
      localStorage.setItem('search-view', next);
    } catch {}
    const params = new URLSearchParams(searchParams as any);
    if (next === 'grid') params.delete('view');
    else params.set('view', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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

  const pimParams = useMemo(() => {
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
    if (collectionSlug) filters.collection_slugs = collectionSlug;
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
  const isSpecialSource =
    source === 'likes' || source === 'trending' || source === 'reminders';

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

  const specialSourceQuery = useInfiniteQuery({
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
        if (!skus.length)
          return { items: [], nextPage: null, total: res?.total_count ?? 0 };
        const result = await fetchPimProductList({
          lang,
          filters: { sku: skus, ...urlFiltersForSpecialQuery },
          rows: skus.length,
        });
        return {
          items: result.items,
          nextPage: res?.has_next ? pageParam + 1 : null,
          total: res?.total_count ?? result.items.length,
        };
      }
      if (source === 'reminders') {
        const res = await apiGetUserReminders(pageParam, pageSizeParam);
        const skus = (res?.reminders || [])
          .map((r: any) => r.sku)
          .filter(Boolean);
        if (!skus.length)
          return { items: [], nextPage: null, total: res?.total_count ?? 0 };
        const result = await fetchPimProductList({
          lang,
          filters: { sku: skus, ...urlFiltersForSpecialQuery },
          rows: skus.length,
        });
        return {
          items: result.items,
          nextPage: res?.has_next ? pageParam + 1 : null,
          total: res?.total_count ?? result.items.length,
        };
      }
      const trendingPage = await apiGetTrendingPage(
        period,
        pageParam,
        pageSizeParam,
        false,
      );
      const skus = (trendingPage?.items || [])
        .map((x: any) => x.sku)
        .filter(Boolean);
      if (!skus.length)
        return {
          items: [],
          nextPage: null,
          total: trendingPage?.total_count ?? 0,
        };
      const result = await fetchPimProductList({
        lang,
        filters: { sku: skus, ...urlFiltersForSpecialQuery },
        rows: skus.length,
      });
      return {
        items: result.items,
        nextPage: trendingPage?.has_next ? pageParam + 1 : null,
        total: trendingPage?.total_count ?? result.items.length,
      };
    },
    enabled: isSpecialSource,
    getNextPageParam: (lastPage) => lastPage?.nextPage ?? undefined,
    initialPageParam: 1,
  });

  const baseQuery = usePimProductListInfiniteQuery(pimParams, {
    groupByParent: true,
  });

  const data = isSpecialSource ? specialSourceQuery.data : baseQuery.data;
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

  // ERP prices
  const [erpPricesMap, setErpPricesMap] = useState<
    Record<string, ErpPriceData>
  >({});
  const fetchedCodesRef = useRef<Set<string>>(new Set());
  const { isAuthorized } = useUI();

  const searchSignature = useMemo(() => {
    const base = JSON.stringify(pimParams);
    if (isSpecialSource) {
      if (source === 'likes') return `likes:${pageSizeParam}`;
      if (source === 'reminders') return `reminders:${pageSizeParam}`;
      return `trending:${period}:${pageSizeParam}`;
    }
    return `base:${base}`;
  }, [isSpecialSource, source, period, pageSizeParam, pimParams]);

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
    return pages[pages.length - 1]?.items ?? [];
  }, [data]);

  const newCodes = useMemo(() => {
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
  }, [newCodes, isAuthorized]);

  const getPrice = (id: string | number) => erpPricesMap[String(id)];

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
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
      { rootMargin: '200px' },
    );
    const sentinel = loadMoreRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [hasNextPage, loadingMore, fetchNextPage]);

  // Sort
  const currentSort = searchParams.get('sort_by') || 'relevance';
  const handleSortChange = (value: string) => {
    const url = new URL(location.href);
    if (value === 'relevance') url.searchParams.delete('sort_by');
    else url.searchParams.set('sort_by', value);
    router.push(`${pathname}${url.search}`, { scroll: false });
  };

  const totalItems =
    data?.pages?.[0]?.total ??
    (data?.pages
      ? data.pages.reduce(
          (sum: number, p: any) => sum + (p?.items?.length || 0),
          0,
        )
      : 0);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        {/* Left: sidebar toggle + count */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:flex w-9 h-9 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] bg-white cursor-pointer items-center justify-center text-[var(--time-gray-500)] transition-colors hover:border-[var(--time-red)] hover:text-[var(--time-red)]"
              aria-label="Toggle sidebar"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="2" y1="4" x2="14" y2="4" />
                <line x1="2" y1="8" x2="10" y2="8" />
                <line x1="2" y1="12" x2="14" y2="12" />
              </svg>
            </button>
          )}
          <span className="text-[14px] text-[var(--time-gray-500)] font-[family-name:var(--font-body)]">
            {data?.pages && (
              <>
                <strong className="text-[var(--time-dark)]">
                  {totalItems}
                </strong>{' '}
                {t('text-items-found', { defaultValue: 'prodotti trovati' })}
              </>
            )}
          </span>
        </div>

        {/* Right: sort + view toggle */}
        <div className="flex items-center gap-2.5">
          {/* Sort dropdown */}
          <div className="relative hidden sm:block">
            <select
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="h-9 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] pl-3 pr-8 text-[12px] font-[family-name:var(--font-body)] text-[var(--time-gray-500)] bg-white cursor-pointer outline-none appearance-none transition-colors hover:border-[var(--time-gray-400)] focus:border-[var(--time-red)] focus:ring-0"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.name, { defaultValue: opt.defaultLabel })}
                </option>
              ))}
            </select>
            <IoChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--time-gray-400)]"
              size={12}
            />
          </div>

          {/* View toggle */}
          <div className="flex rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] overflow-hidden">
            <button
              type="button"
              onClick={() => setView('grid')}
              className="w-9 h-[34px] border-none cursor-pointer flex items-center justify-center transition-all duration-150"
              style={{
                background: !isList ? 'var(--time-dark)' : '#fff',
                color: !isList ? '#fff' : 'var(--time-gray-400)',
              }}
              aria-label="Grid"
              aria-pressed={!isList}
            >
              <IoGridOutline size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="w-9 h-[34px] border-none cursor-pointer flex items-center justify-center transition-all duration-150"
              style={{
                background: isList ? 'var(--time-dark)' : '#fff',
                color: isList ? '#fff' : 'var(--time-gray-400)',
              }}
              aria-label="List"
              aria-pressed={isList}
            >
              <IoListOutline size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Product grid / list */}
      <div
        className={
          isList
            ? 'flex flex-col gap-3'
            : sidebarOpen
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
        }
      >
        {error ? (
          <div className="col-span-full text-center py-10">
            <p className="text-[var(--time-gray-500)]">{error?.message}</p>
          </div>
        ) : isLoading && !data?.pages?.length ? (
          // Loading skeletons
          Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className={
                isList
                  ? 'bg-white rounded-[var(--radius-card)] border border-[var(--time-gray-100)] h-[160px] animate-pulse'
                  : 'bg-white rounded-[var(--radius-card)] border border-[var(--time-gray-100)] animate-pulse'
              }
            >
              <div
                className={
                  isList ? 'flex items-stretch h-full' : 'flex flex-col'
                }
              >
                <div
                  className={
                    isList
                      ? 'w-[140px] bg-[var(--time-gray-100)] shrink-0'
                      : 'h-[180px] bg-[var(--time-gray-100)]'
                  }
                />
                <div className="flex-1 p-4 space-y-3">
                  <div className="h-3 bg-[var(--time-gray-100)] rounded w-1/3" />
                  <div className="h-4 bg-[var(--time-gray-100)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--time-gray-100)] rounded w-full" />
                  <div className="h-6 bg-[var(--time-gray-100)] rounded w-1/4 mt-4" />
                </div>
              </div>
            </div>
          ))
        ) : (
          data?.pages?.map((page: any, pageIdx: number) => {
            let pageItemIndex = 0;
            return page?.items?.map((p: any) => {
              const vars = Array.isArray(p.variations) ? p.variations : [];
              const isSingleVariant =
                vars.length === 1 && (p.variantCount === 1 || !p.variantCount);
              const target = isSingleVariant
                ? { ...vars[0], variantCount: 1 }
                : p;
              const hasMultipleVariants =
                target.variantCount && target.variantCount > 1;
              const priceId = hasMultipleVariants
                ? null
                : vars.length === 1
                  ? vars[0]?.id
                  : target.id;
              const priceData = priceId ? getPrice(priceId) : undefined;
              // Only stagger animation on first page; subsequent pages appear instantly
              const animIndex = pageIdx === 0 ? pageItemIndex : 0;
              pageItemIndex++;

              if (isList) {
                return (
                  <TimeSearchRow
                    key={`row-${target.id}`}
                    product={target}
                    lang={lang}
                    priceData={priceData}
                    index={animIndex}
                  />
                );
              }

              return (
                <TimeSearchCard
                  key={`card-${target.id}`}
                  product={target}
                  lang={lang}
                  priceData={priceData}
                  index={animIndex}
                />
              );
            });
          })
        )}
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={loadMoreRef} className="h-1" />

      {/* Load more */}
      {hasNextPage && (
        <div className="pt-8 text-center xl:pt-10">
          <button
            onClick={() => fetchNextPage()}
            disabled={loadingMore}
            className="h-10 px-8 rounded-[var(--radius-btn)] border border-[var(--time-gray-200)] bg-white text-[var(--time-dark)] text-[13px] font-semibold font-[family-name:var(--font-body)] cursor-pointer transition-all hover:border-[var(--time-red)] hover:text-[var(--time-red)] disabled:opacity-50 disabled:cursor-default"
          >
            {loadingMore
              ? t('text-loading', { defaultValue: 'Caricamento...' })
              : t('button-load-more', { defaultValue: 'Carica altri' })}
          </button>
        </div>
      )}

      {/* End of results */}
      {!hasNextPage && data?.pages && data.pages.length > 1 && (
        <div className="text-center py-8">
          <p className="text-[13px] text-[var(--time-gray-400)] font-[family-name:var(--font-body)]">
            {t('text-all-products-loaded', {
              defaultValue: 'Tutti i prodotti sono stati caricati',
            })}
          </p>
        </div>
      )}

      {/* No results */}
      {!isLoading &&
        data?.pages &&
        data.pages.length > 0 &&
        data.pages.every((page: any) => !page?.items?.length) && (
          <div className="text-center py-20">
            <div className="text-[48px] mb-4">&#x1F50D;</div>
            <p className="text-[16px] font-semibold text-[var(--time-gray-600)] font-[family-name:var(--font-body)]">
              {t('text-no-products-found', {
                defaultValue: 'Nessun prodotto trovato',
              })}
            </p>
            <p className="text-[13px] text-[var(--time-gray-400)] mt-1.5 font-[family-name:var(--font-body)]">
              {t('text-try-different-filters', {
                defaultValue: 'Prova a modificare i filtri o la ricerca',
              })}
            </p>
          </div>
        )}
    </>
  );
};
