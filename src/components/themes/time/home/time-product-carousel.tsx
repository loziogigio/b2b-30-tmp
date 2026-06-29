'use client';

import { useMemo, useState, useEffect } from 'react';
import { Product } from '@framework/types';
import TimeProductCard from '@components/themes/time/product/time-product-card';
import TimeScrollArrows from '@components/themes/time/shared/time-scroll-arrows';
import { useHorizontalScroll } from '@components/themes/time/shared/use-horizontal-scroll';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import Link from '@components/ui/link';
import { useTranslation } from 'src/app/i18n/client';

interface BreakpointConfig {
  [key: string]: { slidesPerView: number; spaceBetween?: number };
}

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
  breakpoints?: BreakpointConfig;
}

/** Given the breakpoints map and the current window width, return slidesPerView + gap. */
function resolveBreakpoint(
  breakpoints: BreakpointConfig,
  width: number,
): { slidesPerView: number; gap: number } {
  const sorted = Object.keys(breakpoints)
    .map(Number)
    .sort((a, b) => b - a);
  for (const bp of sorted) {
    if (width >= bp) {
      const cfg = breakpoints[String(bp)];
      return {
        slidesPerView: cfg.slidesPerView,
        gap: cfg.spaceBetween ?? 16,
      };
    }
  }
  // fallback to smallest breakpoint
  const smallest = sorted[sorted.length - 1];
  const cfg = breakpoints[String(smallest)];
  return {
    slidesPerView: cfg?.slidesPerView ?? 4,
    gap: cfg?.spaceBetween ?? 16,
  };
}

export default function TimeProductCarousel({
  title,
  tag,
  tagColor = 'var(--time-red)',
  products,
  loading,
  error,
  limit = 12,
  uniqueKey,
  lang,
  categorySlug,
  breakpoints,
}: TimeProductCarouselProps) {
  const { t } = useTranslation(lang, 'common');
  // Compute card layout from breakpoints
  const hasBreakpoints = !!breakpoints && Object.keys(breakpoints).length > 0;
  const [cardLayout, setCardLayout] = useState({ slidesPerView: 4, gap: 16 });

  useEffect(() => {
    if (!hasBreakpoints || !breakpoints) return;
    const update = () => {
      const { slidesPerView, gap } = resolveBreakpoint(
        breakpoints,
        window.innerWidth,
      );
      setCardLayout({ slidesPerView, gap });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [hasBreakpoints, breakpoints]);

  const {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    scrollLeft,
    scrollRight,
  } = useHorizontalScroll({ scrollAmount: 320 });

  // ERP prices
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
            onScrollLeft={scrollLeft}
            onScrollRight={scrollRight}
          />
          {normalizedSlug && (
            <Link
              href={normalizedSlug}
              className="h-9 px-4 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] bg-white text-xs font-semibold text-[var(--time-gray-600)] flex items-center gap-1.5 transition-all hover:border-[var(--time-red)] hover:text-[var(--time-red)]"
            >
              {t('view-all-products', { defaultValue: 'Vedi tutti' })}
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
            className="flex overflow-x-auto pt-2 pb-4 -mt-2 [&::-webkit-scrollbar]:hidden"
            style={{
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              gap: hasBreakpoints ? `${cardLayout.gap}px` : '16px',
            }}
          >
            {loading && !products?.length
              ? Array.from({ length: limit }).map((_, idx) => (
                  <div
                    key={`${uniqueKey}-loader-${idx}`}
                    className="shrink-0"
                    style={{
                      scrollSnapAlign: 'start',
                      width: hasBreakpoints
                        ? `calc((100% - ${(cardLayout.slidesPerView - 1) * cardLayout.gap}px) / ${cardLayout.slidesPerView})`
                        : '210px',
                    }}
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

                  const cardWidth = hasBreakpoints
                    ? `calc((100% - ${(cardLayout.slidesPerView - 1) * cardLayout.gap}px) / ${cardLayout.slidesPerView})`
                    : undefined;

                  return (
                    <div
                      key={`${uniqueKey}-${erpKey}`}
                      className="shrink-0 flex"
                      style={{
                        animation: `time-fadeUp 0.4s ease ${0.05 * i}s both`,
                        width: cardWidth,
                      }}
                    >
                      <TimeProductCard
                        product={targetProduct}
                        lang={lang}
                        className={
                          cardWidth
                            ? 'w-full h-full flex flex-col'
                            : 'h-full flex flex-col'
                        }
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
