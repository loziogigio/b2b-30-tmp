"use client";

import { HiOutlineInformationCircle, HiOutlineTrash } from "react-icons/hi";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import cn from "classnames";
import PriceAndPromo from './price-and-promo';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { useModalAction } from '@components/common/modal/modal.context';
import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'src/app/i18n/client';

export interface ComparisonFeature {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ComparisonProduct {
  id: string;
  sku: string;
  title: string;
  model: string;
  status?: "available" | "coming-soon" | "discontinued";
  availabilityText?: string;
  imageUrl?: string;
  description?: string;
  priceData?: ErpPriceData; // Use actual ERP price data
  features: ComparisonFeature[];
  tags?: string[];
  _originalProduct?: any; // Keep reference to original product for modal
}

interface ProductComparisonTableProps {
  products: ComparisonProduct[];
  onRemove?: (sku: string) => void;
  lang: string;
}

export function ProductComparisonTable({ products, onRemove, lang }: ProductComparisonTableProps) {
  const { t } = useTranslation(lang, 'common');

  const statusStyles: Record<NonNullable<ComparisonProduct["status"]>, { label: string; className: string }> = {
    available: { label: t('text-available'), className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    "coming-soon": { label: t('text-coming-soon'), className: "bg-amber-50 text-amber-700 border-amber-100" },
    discontinued: { label: t('text-discontinued'), className: "bg-rose-50 text-rose-700 border-rose-100" }
  };
  const hasAnyTags = products.some((product) => product.tags && product.tags.length > 0);
  const featureLabels = Array.from(
    new Set(
      products.flatMap((product) =>
        product.features.map((feature) => feature.label)
      )
    )
  );

  // Refs and state for horizontal scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Helper function to check if values differ for a specific feature
  const hasFeatureDifference = (label: string): boolean => {
    const values = products.map((product) => {
      const match = product.features.find((feature) => feature.label === label);
      return match?.value ?? '—';
    });
    // Check if all values are the same
    const uniqueValues = new Set(values);
    return uniqueValues.size > 1;
  };

  // Check if models differ
  const hasModelDifference = (): boolean => {
    const models = products.map((product) => product.model || '—');
    const uniqueModels = new Set(models);
    return uniqueModels.size > 1;
  };

  // Check if prices differ
  const hasPriceDifference = (): boolean => {
    const prices = products.map((product) => {
      if (!product.priceData) return 'unavailable';
      // Compare base price
      return product.priceData.price || 'unavailable';
    });
    const uniquePrices = new Set(prices);
    return uniquePrices.size > 1;
  };

  const modelsDiffer = hasModelDifference();
  const pricesDiffer = hasPriceDifference();

  const { openModal } = useModalAction();

  // Open product detail modal
  const handleProductClick = (product: ComparisonProduct, index: number) => {
    // Use the original product object if available, otherwise use comparison product
    const productData = product._originalProduct || product;
    openModal('PRODUCT_VIEW', productData);
  };

  // Check scroll position and update arrow visibility
  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Scroll left/right
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 300;
    const newScrollLeft = direction === 'left'
      ? scrollContainerRef.current.scrollLeft - scrollAmount
      : scrollContainerRef.current.scrollLeft + scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  // Handle touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && canScrollRight) {
      scroll('right');
    }
    if (isRightSwipe && canScrollLeft) {
      scroll('left');
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  // Update scroll buttons on mount and when scrolling
  useEffect(() => {
    updateScrollButtons();

    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [products]);

  return (
    <div
      id="comparison-table"
      className="relative rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.04)]"
    >
      {/* Navigation arrows */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-brand text-white shadow-lg hover:bg-brand/90 transition-all"
          aria-label={t('text-scroll-left')}
        >
          <IoChevronBack className="w-6 h-6" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-brand text-white shadow-lg hover:bg-brand/90 transition-all"
          aria-label={t('text-scroll-right')}
        >
          <IoChevronForward className="w-6 h-6" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <table className="min-w-[960px] border-collapse text-left">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white/95 px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('text-specification')}
              </th>
              {products.map((product) => (
                <th key={product.id} className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {product.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            <tr className="border-t border-slate-100">
              <th className="sticky left-0 bg-white px-4 py-5 text-sm font-semibold text-slate-600">{t('text-product')}</th>
              {products.map((product, index) => {
                const status = product.status ? statusStyles[product.status] : null;
                return (
                  <td key={`${product.id}-product`} className="px-4 py-5 align-top">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleProductClick(product, index)}
                        className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 transition-all hover:border-brand hover:shadow-lg cursor-pointer"
                      >
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            {t('text-no-image')}
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProductClick(product, index)}
                        className="text-base font-semibold text-slate-900 hover:text-brand transition-colors cursor-pointer"
                      >
                        {product.title}
                      </button>
                      {status ? (
                        <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", status.className)}>
                          {product.availabilityText || status.label}
                        </span>
                      ) : product.availabilityText ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {product.availabilityText}
                        </span>
                      ) : null}
                      {hasAnyTags && product.tags?.length ? (
                        <div className="flex flex-wrap justify-center gap-2">
                          {product.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {product.description ? (
                        <p className="text-xs text-slate-500 line-clamp-3">{product.description}</p>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr className={cn(
              "border-t border-slate-100",
              modelsDiffer && "bg-brand"
            )}>
              <th className={cn(
                "sticky left-0 px-4 py-5 text-sm font-semibold",
                modelsDiffer ? "bg-brand text-white" : "bg-white text-slate-600"
              )}>{t('text-model')}</th>
              {products.map((product) => (
                <td key={`${product.id}-model`} className="px-4 py-5 text-center">
                  <span className={cn(
                    "text-base font-semibold",
                    modelsDiffer ? "text-white" : "text-slate-900"
                  )}>{product.model}</span>
                </td>
              ))}
            </tr>

            <tr className={cn(
              "border-t border-slate-100",
              pricesDiffer && "bg-brand"
            )}>
              <th className={cn(
                "sticky left-0 px-4 py-5 text-sm font-semibold",
                pricesDiffer ? "bg-brand text-white" : "bg-white text-slate-600"
              )}>{t('text-price')}</th>
              {products.map((product) => (
                <td key={`${product.id}-price`} className="px-4 py-5 text-center">
                  {product.priceData ? (
                    <div className={pricesDiffer ? "text-white" : ""}>
                      <PriceAndPromo
                        name={product.title}
                        sku={product.sku}
                        priceData={product.priceData}
                        withSchemaOrg={false}
                      />
                    </div>
                  ) : (
                    <div className={cn(
                      "rounded-2xl border border-dashed px-4 py-3 text-sm",
                      pricesDiffer
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    )}>
                      <span className="flex items-center justify-center gap-2">
                        <HiOutlineInformationCircle className={cn(
                          "h-4 w-4",
                          pricesDiffer ? "text-white/70" : "text-slate-400"
                        )} />
                        {t('text-price-not-available')}
                      </span>
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {featureLabels.map((label) => {
              const hasDifference = hasFeatureDifference(label);
              return (
                <tr
                  key={label}
                  className={cn(
                    "border-t border-slate-100",
                    hasDifference && "bg-brand"
                  )}
                >
                  <th className={cn(
                    "sticky left-0 px-4 py-4 text-sm font-semibold",
                    hasDifference ? "bg-brand text-white" : "bg-white text-slate-600"
                  )}>
                    {label}
                  </th>
                  {products.map((product) => {
                    const match = product.features.find((feature) => feature.label === label);
                    return (
                      <td key={`${product.id}-${label}`} className="px-4 py-4 text-center">
                        {match ? (
                          <span
                            className={cn(
                              "text-sm font-medium",
                              match.highlight
                                ? "text-emerald-700 font-semibold"
                                : hasDifference
                                ? "text-white font-semibold"
                                : "text-slate-700"
                            )}
                          >
                            {match.value}
                          </span>
                        ) : (
                          <span className={hasDifference ? "text-white/50" : "text-slate-300"}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}


            {onRemove ? (
              <tr className="border-t border-slate-100">
                <th className="sticky left-0 bg-white px-4 py-5 text-sm font-semibold text-slate-600">{t('text-remove')}</th>
                {products.map((product) => (
                  <td key={`${product.id}-remove`} className="px-4 py-5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(product.sku)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                      {t('text-remove')}
                    </button>
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
