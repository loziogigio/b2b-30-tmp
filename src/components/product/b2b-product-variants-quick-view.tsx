// components/product/b2b-product-variants-quick-view.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LIMITS } from '@framework/utils/limits';
import { fetchErpPrices } from '@framework/erp/prices';
import Button from '@components/ui/button';
import Alert from '@components/ui/alert';
import ProductCardB2B from '@components/product/product-cards/product-card-b2b';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import { useModalAction, useModalState } from '@components/common/modal/modal.context';
import CloseButton from '@components/ui/close-button';
import cn from 'classnames';
import Image from '@components/ui/image';
import { productPlaceholder } from '@assets/placeholders';
import Link from 'next/link';
import { ERP_STATIC } from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';

type VariantMinimal = {
  id: string | number;
  sku?: string;
  name?: string;
  model?: string;
  [k: string]: any;
};

export default function B2BProductVariantsQuickView({ lang }: { lang: string }) {
  const { data } = useModalState();
  const { closeModal } = useModalAction();
  const { isAuthorized } = useUI();

  // normalize payload (allow { product } or raw)
  const raw = (data as any)?.product ?? data;

  // alias fields to avoid shadowing imports
  const {
    name,
    image: productImage,
    sku,
    parent_sku,
    brand,
    description,
  } = raw ?? {};

  const variants: VariantMinimal[] = Array.isArray(raw?.variations) ? raw.variations : [];

  const allIds = useMemo(() => variants.map(v => String(v.id)), [variants]);
  const totalCount = allIds.length;

  // Filter + sort UI
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] =
    useState<'sku-asc' | 'price-asc' | 'price-desc'>('sku-asc');

  const filtered = useMemo(() => {
    if (!query.trim()) return variants;
    const q = query.toLowerCase();
    return variants.filter(v =>
      (v.sku?.toLowerCase().includes(q)) ||
      (v.name?.toLowerCase().includes(q)) ||
      (v.model?.toLowerCase().includes(q))
    );
  }, [variants, query]);

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
    queryKey: ['erp-variant-prices', raw?.id ?? 'no-product', allIds.join(','), pageSize],
    enabled: isAuthorized && totalCount > 0,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const start = pageParam as number;
      const slice = allIds.slice(start, start + pageSize);
      if (slice.length === 0) return { prices: {}, nextIndex: undefined };
      const res = await fetchErpPrices({ ...ERP_STATIC, entity_codes: slice });
      return { prices: res as Record<string, any>, nextIndex: start + slice.length };
    },
    getNextPageParam: (lastPage) =>
      typeof lastPage?.nextIndex === 'number' && lastPage.nextIndex < totalCount
        ? lastPage.nextIndex
        : undefined,
  });

  const priceMap = useMemo(() => {
    const merged: Record<string, any> = {};
    pages?.pages?.forEach(p => Object.assign(merged, p.prices));
    return merged;
  }, [pages]);

  const getSortPrice = (variant: any): number => {
    const row = priceMap[String(variant?.id)];
    if (!row) return Number.POSITIVE_INFINITY;
    const anyPD = row as any;
    const v = anyPD.price_discount ?? anyPD.net_price ?? anyPD.price ?? anyPD.gross_price;
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };

  const sorted = useMemo(() => {
    const copy = filtered.slice();
    if (!isAuthorized || sortKey === 'sku-asc') {
      copy.sort((a, b) => String(a.sku ?? a.id).localeCompare(String(b.sku ?? b.id)));
    } else {
      copy.sort((a, b) => {
        const pa = getSortPrice(a);
        const pb = getSortPrice(b);
        return sortKey === 'price-asc' ? pa - pb : pb - pa;
      });
    }
    return copy;
  }, [filtered, sortKey, priceMap, isAuthorized]);

  // ==== Only the GRID scrolls ====
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const rootEl = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!rootEl || !sentinel) return;

    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) fetchNextPage(); },
      { root: rootEl, rootMargin: '400px 0px', threshold: 0 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const loadedCount = Object.keys(priceMap).length;
  const parentSku = parent_sku ?? sku;
  const title = name || parentSku || '';

  return (
    <div
      className="
        md:w-[640px] lg:w-[980px] xl:w-[1220px] 2xl:w-[1380px]
        mx-auto bg-white rounded-md
        flex flex-col max-h-[85vh] overflow-hidden
      "
    >
      {/* NON-SCROLLING header (parent info) */}
      <div className="border-b px-3 sm:px-4 py-2 relative">
        {/* X button floats on the right, independent of content width */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
          <CloseButton onClick={closeModal} />
        </div>

        <div className="flex items-start gap-3 sm:gap-4 pr-12 sm:pr-0">
          <div className="relative shrink-0 w-[56px] h-[56px] sm:w-[80px] sm:h-[80px] rounded overflow-hidden">
            <Image
              src={productImage?.thumbnail ?? productPlaceholder}
              alt={title || 'Product Image'}
              fill
              quality={90}
              sizes="(max-width: 768px) 25vw, (max-width: 1200px) 15vw, 10vw"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* SKU + Brand (single line, small gap) */}
            <div className="flex items-center text-xs text-gray-500 whitespace-nowrap gap-1.5 min-w-0">
              <span className="uppercase">{sku}</span>

              {brand?.name && brand?.id !== '0' && (
                <>
                  <span className="text-gray-300">•</span>
                  <Link
                    href={`/${lang}/search?filters-id_brand=${brand.id}`}
                    className="text-brand hover:underline uppercase truncate max-w-[55%] sm:max-w-[60%]"
                    title={brand.name}
                    onClick={() => {
                      // let Next.js Link handle the route first, then close the modal
                      setTimeout(() => closeModal(), 0);
                    }}
                  >
                    {brand.name}
                  </Link>
                </>
              )}
            </div>

            {/* title */}
            <h3 className="mt-1 text-sm sm:text-base font-semibold truncate">{title}</h3>

            {/* short description */}
            {description ? (
              <p className="mt-0.5 text-xs sm:text-sm text-gray-600 line-clamp-2">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>


      {/* NON-SCROLLING controls */}
      <div className="border-b px-3 sm:px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {isAuthorized ? (
            <div className="text-xs text-gray-600 whitespace-nowrap order-1 sm:order-none">
              {loadedCount}/{totalCount} priced
            </div>
          ) : null}

          <input
            aria-label="Filter variants"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by SKU, name, model…"
            className="h-9 min-w-[150px] sm:w-[220px] flex-1 rounded-md border px-2 text-sm"
          />

          {isAuthorized && (
          <select
            aria-label="Sort variants"
            value={sortKey}
            onChange={(e) =>
              setSortKey(e.target.value as 'sku-asc' | 'price-asc' | 'price-desc')
            }
            className="h-9 rounded-md border px-2 text-sm"
          >
            <option value="sku-asc">Sort: SKU (A→Z)</option>
            <option value="price-asc">Sort: Price (Low→High)</option>
            <option value="price-desc">Sort: Price (High→Low)</option>
          </select>
          )}
        </div>

        {error && (
          <div className="mt-2">
            <Alert message={(error as any)?.message || 'Failed to load prices.'} />
            <div className="mt-2">
              <Button size="small" onClick={() => refetch()}>Retry</Button>
            </div>
          </div>
        )}
      </div>

      {/* ONLY THIS PART SCROLLS */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 pb-4 pt-3 bg-brand-light"
      >
        <div
          className={cn(
            'grid gap-2 md:gap-3 2xl:gap-4',
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'
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

          {isAuthorized && isFetching && !pages?.pages?.length &&
            Array.from({ length: Math.min(pageSize, sorted.length || totalCount) }).map((_, i) => (
              <ProductCardLoader key={`skeleton-${i}`} uniqueKey={`skeleton-${i}`} />
            ))
          }
        </div>

        {/* sentinel inside the scrollable grid */}
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
      </div>
    </div>
  );
}
