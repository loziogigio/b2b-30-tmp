'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Product } from '@framework/types';
import { fetchErpPrices } from '@framework/erp/prices';
import { useQuery } from '@tanstack/react-query';
import { ERP_STATIC } from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';
import TimeProductCard from '@components/themes/time/product/time-product-card';
import TimeScrollArrows from '@components/themes/time/shared/time-scroll-arrows';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import Link from 'next/link';

interface TimeProductCarouselProps {
  title: string;
  tag?: string;
  tagColor?: string;
  products?: Product[];
  loading: boolean;
  error?: string;
  limit?: number;
  uniqueKey?: string;
  lang: string;
  categorySlug?: string;
}

export default function TimeProductCarousel({
  title,
  tag,
  tagColor = '#e63946',
  products,
  loading,
  error,
  limit = 12,
  uniqueKey,
  lang,
  categorySlug,
}: TimeProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [checkScroll]);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  // ERP prices
  const entity_codes = useMemo<string[]>(() => {
    if (!Array.isArray(products)) return [];
    return products
      .map((p: any) => {
        const variations = Array.isArray(p?.variations) ? p.variations : [];
        if (variations.length === 1) return String(variations[0]?.id ?? '');
        if (variations.length > 1) return '';
        return String(p?.id ?? '');
      })
      .filter((v) => v && v !== '');
  }, [products]);

  const { isAuthorized } = useUI();
  const erpPayload = { entity_codes, ...ERP_STATIC };
  const { data: erpPricesData } = useQuery({
    queryKey: ['erp-prices', erpPayload],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: isAuthorized && entity_codes.length > 0,
  });

  const normalizedSlug = categorySlug ? `/${lang}/${categorySlug}` : undefined;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          {tag && (
            <span
              className="text-[10px] font-bold text-white px-2.5 py-1 rounded-md uppercase tracking-wider font-[family-name:var(--font-body)]"
              style={{ background: tagColor }}
            >
              {tag}
            </span>
          )}
          <h2 className="text-[22px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-display)] tracking-tight">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <TimeScrollArrows
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            onScrollLeft={() => scroll(-1)}
            onScrollRight={() => scroll(1)}
          />
          {normalizedSlug && (
            <Link
              href={normalizedSlug}
              className="h-9 px-4 rounded-[10px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-xs font-semibold text-[var(--time-gray-600)] flex items-center gap-1.5 transition-all hover:border-[var(--time-red)] hover:text-[var(--time-red)]"
            >
              Vedi tutti
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12,5 19,12 12,19" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Scrollable cards */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-4 overflow-x-auto pt-2 pb-4 -mt-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
          >
            {loading && !products?.length
              ? Array.from({ length: limit }).map((_, idx) => (
                  <div
                    key={`${uniqueKey}-loader-${idx}`}
                    className="min-w-[210px] max-w-[210px] shrink-0"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <ProductCardLoader uniqueKey={`${uniqueKey}-${idx}`} />
                  </div>
                ))
              : Array.isArray(products) &&
                products.map((p: any, i: number) => {
                  const variations = Array.isArray(p?.variations)
                    ? p.variations
                    : [];
                  const isSingleVariation = variations.length === 1;
                  const targetProduct = isSingleVariation
                    ? {
                        ...p,
                        ...variations[0],
                        id_parent: p.id_parent ?? p.id,
                        parent_sku: p.parent_sku ?? p.sku,
                        image: variations[0]?.image ?? p.image,
                        gallery:
                          (variations[0]?.gallery?.length
                            ? variations[0].gallery
                            : p.gallery) ?? [],
                        variations: [],
                      }
                    : p;
                  const erpKey = String(targetProduct?.id ?? p?.id ?? '');
                  const priceData = erpPricesData?.[erpKey];

                  return (
                    <div
                      key={`${uniqueKey}-${erpKey}`}
                      className="shrink-0"
                      style={{
                        animation: `time-fadeUp 0.4s ease ${0.05 * i}s both`,
                      }}
                    >
                      <TimeProductCard
                        product={targetProduct}
                        lang={lang}
                        priceData={priceData}
                      />
                    </div>
                  );
                })}
          </div>
          {/* Right fade-out gradient */}
          <div className="absolute top-0 right-0 bottom-4 w-16 pointer-events-none bg-gradient-to-l from-white to-transparent" />
        </div>
      )}
    </section>
  );
}
