// components/product/b2b-variants-grid-content.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LIMITS } from '@framework/utils/limits';
import { fetchErpPrices } from '@framework/erp/prices';
import ProductCardB2B from '@components/product/product-cards/product-card-b2b';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import cn from 'classnames';
import Image from '@components/ui/image';
import { productPlaceholder } from '@assets/placeholders';
import Link from 'next/link';
import { ERP_STATIC } from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';
import Button from '@components/ui/button';
import Alert from '@components/ui/alert';

type VariantMinimal = {
  id: string | number;
  sku?: string;
  name?: string;
  model?: string;
  [k: string]: any;
};

interface B2BVariantsGridContentProps {
  lang: string;
  /** The parent product with variations array */
  product: any;
  /** When true, uses window/viewport scroll instead of contained scroll div */
  useWindowScroll?: boolean;
  /** Optional callback when brand link is clicked (e.g. close modal) */
  onBrandClick?: () => void;
}

export default function B2BVariantsGridContent({
  lang,
  product,
  useWindowScroll = false,
  onBrandClick,
}: B2BVariantsGridContentProps) {
  const { isAuthorized } = useUI();
  const { t } = useTranslation(lang, 'common');

  const {
    name,
    image: productImage,
    sku,
    parent_sku,
    brand,
    description,
  } = product ?? {};

  const variants: VariantMinimal[] = Array.isArray(product?.variations)
    ? product.variations
    : [];

  const allIds = useMemo(() => variants.map((v) => String(v.id)), [variants]);
  const totalCount = allIds.length;

  // Filter + sort UI
  const [sortKey, setSortKey] = useState<
    'sku-asc' | 'price-asc' | 'price-desc'
  >('sku-asc');
  const [query, setQuery] = useState('');
  // model tag filter
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => {
      const m = String(v.model ?? '').trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }, [variants]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const toggleModel = (m: string) =>
    setSelectedModels((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    let base = variants;
    if (selectedModels.length) {
      const s = new Set(selectedModels.map((m) => String(m).trim()));
      base = base.filter((v) => s.has(String(v.model ?? '').trim()));
    }
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (v) =>
        v.sku?.toLowerCase().includes(q) ||
        v.name?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q),
    );
  }, [variants, selectedModels, query]);

  const pageSize = LIMITS.PRODUCTS_LIMITS;

  const {
    data: pages,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      'erp-variant-prices',
      product?.id ?? 'no-product',
      allIds.join(','),
      pageSize,
    ],
    enabled: isAuthorized && totalCount > 0,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const start = pageParam as number;
      const slice = allIds.slice(start, start + pageSize);
      if (slice.length === 0) return { prices: {}, nextIndex: undefined };
      const res = await fetchErpPrices({ ...ERP_STATIC, entity_codes: slice });
      return {
        prices: res as Record<string, any>,
        nextIndex: start + slice.length,
      };
    },
    getNextPageParam: (lastPage) =>
      typeof lastPage?.nextIndex === 'number' && lastPage.nextIndex < totalCount
        ? lastPage.nextIndex
        : undefined,
  });

  const priceMap = useMemo(() => {
    const merged: Record<string, any> = {};
    pages?.pages?.forEach((p) => Object.assign(merged, p.prices));
    return merged;
  }, [pages]);

  const getSortPrice = (variant: any): number => {
    const row = priceMap[String(variant?.id)];
    if (!row) return Number.POSITIVE_INFINITY;
    const anyPD = row as any;
    const v =
      anyPD.price_discount ??
      anyPD.net_price ??
      anyPD.price ??
      anyPD.gross_price;
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };

  const sorted = useMemo(() => {
    const copy = filtered.slice();
    if (selectedModels.length > 0) {
      copy.sort((a, b) =>
        String(a.model ?? '').localeCompare(String(b.model ?? ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );
    } else if (!isAuthorized || sortKey === 'sku-asc') {
      copy.sort((a, b) =>
        String(a.sku ?? a.id).localeCompare(String(b.sku ?? b.id)),
      );
    } else {
      copy.sort((a, b) => {
        const pa = getSortPrice(a);
        const pb = getSortPrice(b);
        return sortKey === 'price-asc' ? pa - pb : pb - pa;
      });
    }
    return copy;
  }, [filtered, sortKey, priceMap, isAuthorized, selectedModels]);

  // Scroll + infinite loading
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observerOptions: IntersectionObserverInit = useWindowScroll
      ? { rootMargin: '400px 0px', threshold: 0 }
      : { root: scrollRef.current, rootMargin: '400px 0px', threshold: 0 };

    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) fetchNextPage();
    }, observerOptions);

    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, useWindowScroll]);

  const loadedCount = Object.keys(priceMap).length;
  const parentSku = parent_sku ?? sku;
  const title = name || parentSku || '';

  // Grid content (shared between scroll modes)
  const gridContent = (
    <>
      <div
        className={cn(
          'grid gap-2 md:gap-3 2xl:gap-4',
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
        )}
      >
        {sorted.map((v) => {
          const id = String(v.id);
          const priceData = priceMap[id];
          return (
            <ProductCardB2B
              key={`variant-${id}`}
              product={v as any}
              lang={lang}
              priceData={priceData}
            />
          );
        })}

        {isAuthorized &&
          isFetching &&
          !pages?.pages?.length &&
          Array.from({
            length: Math.min(pageSize, sorted.length || totalCount),
          }).map((_, i) => (
            <ProductCardLoader
              key={`skeleton-${i}`}
              uniqueKey={`skeleton-${i}`}
            />
          ))}
      </div>

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-8" />

      {isAuthorized && hasNextPage && (
        <div className="pt-2 text-center">
          <Button
            loading={isFetchingNextPage}
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            Load more prices
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div
      className={cn(
        'bg-white flex flex-col',
        !useWindowScroll && 'h-full overflow-hidden',
      )}
    >
      {/* Header: parent product info */}
      <div className="border-b px-3 sm:px-4 py-2">
        <div className="flex items-start gap-3 sm:gap-4 pr-12 sm:pr-0">
          <div className="relative shrink-0 w-[56px] h-[56px] sm:w-[80px] sm:h-[80px] rounded overflow-hidden">
            <Image
              src={productImage?.thumbnail || productPlaceholder}
              alt={title || 'Product Image'}
              fill
              quality={90}
              sizes="(max-width: 768px) 25vw, (max-width: 1200px) 15vw, 10vw"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center text-xs text-gray-500 whitespace-nowrap gap-1.5 min-w-0">
              <span className="uppercase">{sku}</span>

              {brand?.name && brand?.id !== '0' && (
                <>
                  <span className="text-gray-300">&bull;</span>
                  <Link
                    href={`/${lang}/search?filters-brand_id=${brand.id}`}
                    className="text-brand hover:underline uppercase truncate max-w-[55%] sm:max-w-[60%]"
                    title={brand.name}
                    onClick={
                      onBrandClick
                        ? () => setTimeout(() => onBrandClick(), 0)
                        : undefined
                    }
                  >
                    {brand.name}
                  </Link>
                </>
              )}
            </div>

            <h3 className="mt-1 text-sm sm:text-base font-semibold truncate">
              {title}
            </h3>

            {description ? (
              <p className="mt-0.5 text-xs sm:text-sm text-gray-600 line-clamp-2">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Controls: counter, search, sort, model tags */}
      <div className="border-b px-3 sm:px-4 py-2.5">
        {isAuthorized ? (
          <div className="flex justify-end mb-1">
            <div className="text-[11px] text-gray-600">
              {loadedCount}/{totalCount} priced
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              aria-label="Filter variants"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by SKU, name, model…"
              className="h-10 sm:h-11 w-full rounded-md border px-3 pr-10 text-sm bg-white border-gray-300 placeholder-gray-500 focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
          {isAuthorized && (
            <div className="shrink-0 ml-auto">
              <select
                aria-label="Sort variants"
                value={sortKey}
                onChange={(e) =>
                  setSortKey(
                    e.target.value as 'sku-asc' | 'price-asc' | 'price-desc',
                  )
                }
                className="h-10 sm:h-11 rounded-md border px-2 text-sm bg-white border-gray-300"
              >
                <option value="sku-asc">Sort: SKU (A&rarr;Z)</option>
                <option value="price-asc">Sort: Price (Low&rarr;High)</option>
                <option value="price-desc">Sort: Price (High&rarr;Low)</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {modelOptions.map((m) => (
            <button
              key={`mdl-${m}`}
              type="button"
              className={cn(
                'px-2 py-1 rounded-md border text-xs font-medium transition-colors',
                selectedModels.includes(m)
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400',
              )}
              onClick={() => toggleModel(m)}
            >
              {m}
            </button>
          ))}

          {selectedModels.length > 0 && (
            <button
              type="button"
              className="ml-1 px-2 py-1 rounded-md border text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => setSelectedModels([])}
            >
              {t('text-clear-all', { defaultValue: 'Clear all' })}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-2">
            <Alert
              message={(error as any)?.message || 'Failed to load prices.'}
            />
            <div className="mt-2">
              <Button size="small" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Grid area */}
      {useWindowScroll ? (
        <div className="px-2 sm:px-3 pb-4 pt-3 bg-brand-light">
          {gridContent}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 pb-4 pt-3 bg-brand-light"
        >
          {gridContent}
        </div>
      )}
    </div>
  );
}
