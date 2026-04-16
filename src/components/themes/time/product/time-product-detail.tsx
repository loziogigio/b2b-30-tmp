'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Image from '@components/ui/image';
import { useTranslation } from 'src/app/i18n/client';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import { useQuery } from '@tanstack/react-query';
import { fetchErpPrices } from '@framework/erp/prices';
import { ERP_STATIC } from '@framework/utils/static';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { useUI } from '@contexts/ui.context';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { productPlaceholder } from '@assets/placeholders';
import AddToCart from '@components/product/add-to-cart';
import TimeProductTabs from './time-product-tabs';
import CorrelatedProductsCarousel from '@components/product/feeds/correlated-products-carousel';
import TimeVariantsGrid from './time-variants-grid';
import ProductJsonLd from '@components/seo/product-json-ld';
import { printProductDetail } from '@utils/print-product';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { ROUTES } from '@utils/routes';
import {
  IoIosHeart,
  IoIosHeartEmpty,
  IoIosArrowBack,
  IoIosArrowForward,
} from 'react-icons/io';
import { IoArrowRedoOutline } from 'react-icons/io5';
import {
  HiOutlinePrinter,
  HiOutlineSwitchHorizontal,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import { ReminderIcon, ReminderIconFilled } from '@components/icons/app-icons';
import { useCompareList } from '@/contexts/compare/compare.context';
import cn from 'classnames';

import type { PageBlock } from '@/lib/types/blocks';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';

type GalleryImage = {
  id?: string | number;
  original: string;
  thumbnail?: string;
  alt?: string;
};

/* ─── Main Component ─── */

const TimeProductDetail: React.FC<{
  lang: string;
  search: any;
  blocks?: PageBlock[];
  showZoneLabels?: boolean;
}> = ({ lang, search, blocks = [] }) => {
  const { t } = useTranslation(lang, 'common');

  /* ── Zone blocks ── */
  const zone3Blocks = blocks.filter((b) => b.zone === 'zone3');
  const zone4Blocks = blocks.filter((b) => b.zone === 'zone4');

  /* ── PIM product data ── */
  const skuToSearch = search?.sku ? [search.sku] : [];
  const { data: pimResults = [], isLoading } = usePimProductListQuery(
    { limit: 1, filters: { sku: skuToSearch } },
    { enabled: skuToSearch.length > 0, groupByParent: true },
  );

  const skuNotFound =
    !isLoading && skuToSearch.length > 0 && pimResults.length === 0;
  const { data: parentSkuResults = [] } = usePimProductListQuery(
    { limit: 200, filters: { parent_sku: skuToSearch } },
    { enabled: skuNotFound, groupByParent: true },
  );

  const resolvedResults = pimResults.length > 0 ? pimResults : parentSkuResults;
  const first = resolvedResults?.[0];
  const isFromParentSearch =
    pimResults.length === 0 && parentSkuResults.length > 1;
  const variations = isFromParentSearch
    ? parentSkuResults
    : Array.isArray(first?.variations)
      ? first.variations
      : [];
  const isMultiVariantParent = variations.length > 1;

  const data = isMultiVariantParent
    ? isFromParentSearch
      ? { ...first, sku: search.sku, name: first?.name, variations }
      : first
    : !isMultiVariantParent && variations.length === 1
      ? variations[0]
      : first;

  /* ── ERP prices ── */
  const entityCodes = isMultiVariantParent
    ? []
    : [String(data?.id ?? '')].filter(Boolean);
  const { isAuthorized } = useUI();
  const { settings } = useHomeSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;
  const { data: erpPricesData } = useQuery({
    queryKey: ['erp-prices', entityCodes],
    queryFn: () => fetchErpPrices({ ...ERP_STATIC, entity_codes: entityCodes }),
    enabled: isAuthorized && entityCodes.length > 0,
  });
  const erpPrice: ErpPriceData | undefined = Array.isArray(erpPricesData)
    ? erpPricesData[0]
    : (erpPricesData as any)?.[entityCodes[0]];

  /* ── Derived price info ── */
  const anyPD = erpPrice as any;
  const netPrice =
    anyPD?.price_discount ?? anyPD?.net_price ?? anyPD?.price_gross ?? null;
  const listPrice = anyPD?.price_gross ?? anyPD?.gross_price ?? null;
  const hasDiscount =
    netPrice != null &&
    listPrice != null &&
    Number(listPrice) > Number(netPrice) &&
    Number(netPrice) > 0;
  const savings = hasDiscount
    ? (Number(listPrice) - Number(netPrice)).toFixed(decimals)
    : null;
  const hasValidPrice = erpPrice && netPrice != null && Number(netPrice) > 0;
  const isOutOfStock = erpPrice ? Number(erpPrice.availability) <= 0 : false;
  const canAddToCart = erpPrice?.product_label_action?.ADD_TO_CART ?? true;

  /* ── Packaging info ── */
  const um =
    erpPrice?.packaging_option_default?.packaging_uom || data?.unit || null;
  const mv = erpPrice?.packaging_option_smallest?.qty_x_packaging ?? null;
  const cf = erpPrice?.packaging_option_default?.qty_x_packaging ?? null;

  /* ── Likes / Reminders ── */
  const likes = useLikes();
  const reminders = useReminders();
  const sku = String(data?.sku ?? '');
  const favorite = isAuthorized && sku ? likes.isLiked(sku) : false;
  const hasReminder = isAuthorized && sku ? reminders.hasReminder(sku) : false;
  const {
    addSku: addSkuToCompare,
    removeSku: removeSkuFromCompare,
    hasSku,
  } = useCompareList();
  const isInCompare = hasSku(sku);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  React.useEffect(() => {
    if (!sku) return;
    likes.loadBulkStatus([sku]).catch(() => {});
    reminders.loadBulkStatus([sku]).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku]);

  const toggleWishlist = async () => {
    if (!sku) return;
    setWishlistLoading(true);
    try {
      await likes.toggle(sku);
    } finally {
      setWishlistLoading(false);
    }
  };

  const toggleReminder = async () => {
    if (!sku) return;
    setReminderLoading(true);
    try {
      await reminders.toggle(sku);
    } finally {
      setReminderLoading(false);
    }
  };

  const handleToggleCompare = useCallback(() => {
    if (!sku) return;
    if (hasSku(sku)) removeSkuFromCompare(sku);
    else addSkuToCompare(sku);
  }, [sku, hasSku, addSkuToCompare, removeSkuFromCompare]);

  const handlePrint = useCallback(() => {
    if (!data) return;
    printProductDetail(data, erpPrice, decimals);
  }, [data, erpPrice, decimals]);

  /* ── Gallery ── */
  const [activeImage, setActiveImage] = useState(0);
  const galleryItems = useMemo<GalleryImage[]>(() => {
    if (!data) return [];
    if (Array.isArray(data.gallery) && data.gallery.length > 0) {
      return data.gallery.map((item: any, i: number) => ({
        id: item.id ?? `img-${i}`,
        original: item.original ?? productPlaceholder,
        thumbnail: item.thumbnail ?? item.original ?? productPlaceholder,
        alt: item.alt ?? data.name ?? 'Product',
      }));
    }
    const fallback =
      data.image?.original ?? data.image?.thumbnail ?? productPlaceholder;
    return [
      {
        id: 'primary',
        original: fallback,
        thumbnail: data.image?.thumbnail ?? fallback,
        alt: data.name ?? 'Product',
      },
    ];
  }, [data]);

  const [copied, setCopied] = useState(false);
  const copySkuToClipboard = () => {
    navigator.clipboard.writeText(sku).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  /* ── Loading / empty states ── */
  if (isLoading) {
    return (
      <div className="py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 animate-pulse">
          <div className="aspect-square rounded-2xl bg-[var(--time-gray-100)]" />
          <div className="space-y-4 pt-4">
            <div className="h-6 bg-[var(--time-gray-100)] rounded w-1/4" />
            <div className="h-8 bg-[var(--time-gray-100)] rounded w-3/4" />
            <div className="h-20 bg-[var(--time-gray-100)] rounded w-full" />
            <div className="h-32 bg-[var(--time-gray-100)] rounded w-full" />
          </div>
        </div>
      </div>
    );
  }
  if (!data) return null;

  /* ── Multi-variant parent: show variant grid ── */
  if (isMultiVariantParent) {
    return (
      <div className="pt-7 pb-2">
        <div className="mb-8">
          <TimeVariantsGrid lang={lang} product={data} />
        </div>
        <TimeProductTabs
          lang={lang}
          product={data}
          zone3Blocks={zone3Blocks}
          className="mb-8"
        />
        {data?.id && (
          <div className="pt-8">
            <CorrelatedProductsCarousel
              lang={lang}
              entityCode={String(data.id)}
              limit={12}
            />
          </div>
        )}
      </div>
    );
  }

  /* ── Promo badge info ── */
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(netPrice) / Number(listPrice)) * 100)
    : 0;
  const promoLabel = erpPrice?.is_promo || data?.has_active_promo;

  return (
    <div className="pt-7 pb-16">
      <ProductJsonLd product={data} priceData={erpPrice} lang={lang} />

      {/* ═══ HERO: Gallery + Details ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 xl:gap-10 mb-12">
        {/* ── LEFT: Gallery ── */}
        <div>
          {/* Main image */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--time-gray-50)] to-[#eef0f4] border border-[var(--time-gray-100)] mb-3">
            <div className="aspect-square relative">
              <Image
                src={galleryItems[activeImage]?.original || productPlaceholder}
                alt={galleryItems[activeImage]?.alt || 'Product'}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>

            {/* Promo badges */}
            {(discountPercent > 0 || promoLabel) && (
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {discountPercent > 0 && (
                  <span className="bg-[var(--time-red)] text-white text-[13px] font-extrabold px-3.5 py-1.5 rounded-lg font-[family-name:var(--font-body)]">
                    -{discountPercent}%
                  </span>
                )}
                {promoLabel && (
                  <span className="bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-md font-mono tracking-wide uppercase">
                    DISCOUNT
                  </span>
                )}
              </div>
            )}

            {/* Nav arrows */}
            {galleryItems.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImage(
                      (prev) =>
                        (prev - 1 + galleryItems.length) % galleryItems.length,
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-[9px] border-[1.5px] border-[var(--time-gray-200)] bg-white/90 backdrop-blur flex items-center justify-center text-[var(--time-gray-500)] transition-colors hover:border-[var(--time-red)] hover:text-[var(--time-red)] cursor-pointer"
                >
                  <IoIosArrowBack size={16} />
                </button>
                <button
                  onClick={() =>
                    setActiveImage((prev) => (prev + 1) % galleryItems.length)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-[9px] border-[1.5px] border-[var(--time-gray-200)] bg-white/90 backdrop-blur flex items-center justify-center text-[var(--time-gray-500)] transition-colors hover:border-[var(--time-red)] hover:text-[var(--time-red)] cursor-pointer"
                >
                  <IoIosArrowForward size={16} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {galleryItems.length > 1 && (
            <div className="flex gap-2.5">
              {galleryItems.slice(0, 6).map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    'w-20 h-20 rounded-[10px] overflow-hidden cursor-pointer transition-all relative shrink-0',
                    activeImage === idx
                      ? 'border-2 border-[var(--time-red)] shadow-[0_0_0_3px_rgba(230,57,70,0.15)]'
                      : 'border-[1.5px] border-[var(--time-gray-200)] hover:border-[var(--time-gray-400)]',
                  )}
                >
                  <Image
                    src={img.thumbnail || productPlaceholder}
                    alt={img.alt || ''}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Product Details ── */}
        <div className="flex flex-col">
          {/* Brand + SKU + Fig */}
          <div className="flex items-center gap-2.5 flex-wrap mb-4">
            {data.brand?.name && (
              <span className="bg-[var(--time-red)] text-white text-xs sm:text-[13px] font-extrabold px-3 py-[5px] rounded-[7px] font-[family-name:var(--font-body)] uppercase">
                {data.brand.name}
              </span>
            )}
            <button
              onClick={copySkuToClipboard}
              className="flex items-center gap-1.5 bg-[var(--time-gray-50)] border border-[var(--time-gray-200)] text-[11px] sm:text-xs font-semibold text-[var(--time-dark)] px-2.5 py-1 rounded-md cursor-pointer hover:border-[var(--time-gray-400)] transition-colors font-mono"
              title={copied ? 'Copiato!' : 'Copia SKU'}
            >
              {sku}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-50"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            {data.figure_code && (
              <span className="text-[11px] sm:text-xs text-[var(--time-gray-400)] font-mono">
                Fig: {data.figure_code}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-[900] text-[var(--time-dark)] font-[family-name:var(--font-heading)] tracking-[-0.03em] leading-tight mb-3">
            {data.name}
          </h1>

          {/* Description */}
          {data.description && (
            <p className="text-sm sm:text-[15px] text-[var(--time-gray-600)] leading-[1.65] mb-5 max-w-[560px] font-[family-name:var(--font-body)]">
              {data.description}
            </p>
          )}

          {/* Quick specs grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-[14px_18px] rounded-xl bg-[var(--time-gray-50)] border border-[var(--time-gray-100)] mb-5">
            {data.model && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-model', { defaultValue: 'Modello' })}
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-[var(--time-dark)]">
                  {data.model}
                </span>
              </>
            )}
            {data.weight && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-weight', { defaultValue: 'Peso' })}
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-[var(--time-dark)]">
                  {data.weight} kg
                </span>
              </>
            )}
            {data.volume && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-volume', { defaultValue: 'Volume' })}
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-[var(--time-dark)]">
                  {data.volume}
                </span>
              </>
            )}
            {erpPrice && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-status', { defaultValue: 'Stato' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-[7px] h-[7px] rounded-full inline-block"
                    style={{
                      background: isOutOfStock ? '#dc2626' : '#059669',
                    }}
                  />
                  <span
                    className="text-xs sm:text-[13px] font-bold"
                    style={{ color: isOutOfStock ? '#dc2626' : '#059669' }}
                  >
                    {isOutOfStock
                      ? t('text-out-stock', {
                          defaultValue: 'Non disponibile',
                        })
                      : t('text-in-stock', { defaultValue: 'Disponibile' })}
                  </span>
                </span>
              </>
            )}
          </div>

          {/* ── Price section ── */}
          {isAuthorized && (
            <div className="p-5 rounded-[14px] border-2 border-[var(--time-gray-100)] bg-white mb-4">
              {/* List price + packaging info */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-list-price', { defaultValue: 'Listino' })}
                </span>
                {(um || mv != null || cf != null) && (
                  <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-mono">
                    {um && <>UM: {um}</>}
                    {mv != null && <> · MV: {mv}</>}
                    {cf != null && <> · CF: {cf}</>}
                  </span>
                )}
              </div>

              {hasDiscount && (
                <div className="text-[15px] sm:text-base text-[var(--time-gray-400)] line-through mb-2 tabular-nums">
                  &euro;{Number(listPrice).toFixed(decimals)}
                </div>
              )}

              {/* Promo banner */}
              {promoLabel && (
                <div className="flex items-center justify-between bg-[rgba(230,57,70,0.04)] border border-[rgba(230,57,70,0.15)] rounded-[10px] px-3.5 py-2.5 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-[13px] font-bold text-[var(--time-red)]">
                      DISCOUNT
                    </span>
                    {discountPercent > 0 && (
                      <span className="text-xs sm:text-[13px] font-semibold text-[var(--time-gray-600)]">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Net price */}
              <div className="flex items-center gap-3 mb-4">
                {netPrice != null && Number(netPrice) > 0 ? (
                  <>
                    <span className="text-[32px] sm:text-[36px] lg:text-[38px] font-[900] text-[var(--time-dark)] font-[family-name:var(--font-heading)] tabular-nums tracking-[-0.02em]">
                      &euro;{Number(netPrice).toFixed(decimals)}
                    </span>
                    {savings && (
                      <span className="bg-[#f0fdf4] text-[#059669] text-[13px] sm:text-sm font-bold px-2.5 py-1 rounded-md">
                        Risparmi &euro;{savings}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[15px] sm:text-base text-[var(--time-gray-400)]">
                    &mdash;
                  </span>
                )}
              </div>

              {/* Add to cart */}
              {hasValidPrice && canAddToCart && (
                <div className="flex items-center gap-2.5">
                  <AddToCart
                    lang={lang}
                    product={data}
                    priceData={erpPrice}
                    showPlaceholder={false}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAuthorized && (
              <button
                onClick={toggleWishlist}
                disabled={wishlistLoading}
                className="h-[38px] px-3.5 rounded-[9px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-xs sm:text-[13px] font-semibold flex items-center gap-[7px] cursor-pointer transition-colors hover:border-[var(--time-red)] hover:text-[var(--time-red)] disabled:opacity-50 font-[family-name:var(--font-body)]"
                style={{
                  color: favorite ? 'var(--time-red)' : 'var(--time-gray-600)',
                }}
              >
                {favorite ? (
                  <IoIosHeart size={16} />
                ) : (
                  <IoIosHeartEmpty size={16} />
                )}
                {favorite
                  ? t('text-favorited', { defaultValue: 'Preferito' })
                  : t('text-wishlist', { defaultValue: 'Preferiti' })}
              </button>
            )}
            {isAuthorized && (isOutOfStock || hasReminder) && (
              <button
                onClick={toggleReminder}
                disabled={reminderLoading}
                className="h-[38px] px-3.5 rounded-[9px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-xs sm:text-[13px] font-semibold flex items-center gap-[7px] cursor-pointer transition-colors hover:border-yellow-500 hover:text-yellow-500 disabled:opacity-50 font-[family-name:var(--font-body)]"
                style={{
                  color: hasReminder ? '#eab308' : 'var(--time-gray-600)',
                }}
              >
                {hasReminder ? (
                  <ReminderIconFilled size={16} />
                ) : (
                  <ReminderIcon size={16} />
                )}
                {hasReminder
                  ? t('text-reminder-active', {
                      defaultValue: 'Promemoria attivo',
                    })
                  : t('text-reminder-notify', { defaultValue: 'Avvisami' })}
              </button>
            )}
            <button
              onClick={handleToggleCompare}
              disabled={!sku}
              className="h-[38px] px-3.5 rounded-[9px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-xs sm:text-[13px] font-semibold flex items-center gap-[7px] cursor-pointer transition-colors hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50 font-[family-name:var(--font-body)]"
              style={{
                color: isInCompare ? '#059669' : 'var(--time-gray-600)',
                borderColor: isInCompare ? '#6ee7b7' : undefined,
              }}
            >
              {isInCompare ? (
                <HiOutlineCheckCircle size={16} />
              ) : (
                <HiOutlineSwitchHorizontal size={16} />
              )}
              {isInCompare
                ? t('text-in-compare', { defaultValue: 'Confronto' })
                : t('text-compare', { defaultValue: 'Confronta' })}
            </button>
            <button
              onClick={() => {
                if (typeof navigator.share === 'function') {
                  navigator.share({
                    title: data.name,
                    url: window.location.href,
                  });
                }
              }}
              className="h-[38px] px-3.5 rounded-[9px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-xs sm:text-[13px] font-semibold text-[var(--time-gray-600)] flex items-center gap-[7px] cursor-pointer transition-colors hover:border-[var(--time-gray-400)] font-[family-name:var(--font-body)]"
            >
              <IoArrowRedoOutline size={16} />
              {t('text-share', { defaultValue: 'Condividi' })}
            </button>
            <button
              onClick={handlePrint}
              className="h-[38px] px-3.5 rounded-[9px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-xs sm:text-[13px] font-semibold text-[var(--time-gray-600)] flex items-center gap-[7px] cursor-pointer transition-colors hover:border-[var(--time-gray-400)] font-[family-name:var(--font-body)]"
            >
              <HiOutlinePrinter size={16} />
              {t('text-print', { defaultValue: 'Stampa' })}
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-5 mt-5 pt-3.5 border-t border-[var(--time-gray-100)]">
            <TrustBadge icon="truck" text="Consegna 2-4 giorni" />
            <TrustBadge icon="shield" text="Reso 30 giorni" />
            <TrustBadge icon="box" text="Garanzia inclusa" />
          </div>
        </div>
      </div>

      {/* ═══ FREQUENTLY BOUGHT TOGETHER (static) ═══ */}
      <FrequentlyBoughtTogether
        currentProduct={data}
        currentPrice={netPrice}
        galleryItems={galleryItems}
      />

      {/* ═══ TABS ═══ */}
      <TimeProductTabs lang={lang} product={data} zone3Blocks={zone3Blocks} />

      {/* ═══ RECENTLY BOUGHT (static) ═══ */}
      <RecentlyBoughtByYou />

      {/* ═══ ZONE 4 BLOCKS ═══ */}
      {zone4Blocks.length > 0 && (
        <div className="mb-12 space-y-4">
          {zone4Blocks.map((block, index) => (
            <BlockRenderer
              key={block.id || `zone4-${index}`}
              block={block}
              productData={{ sku, lang }}
            />
          ))}
        </div>
      )}

      {/* ═══ CORRELATED PRODUCTS ═══ */}
      {data?.id && (
        <div className="mb-12">
          <CorrelatedProductsCarousel
            lang={lang}
            entityCode={String(data.id)}
            limit={12}
          />
        </div>
      )}

      {/* ═══ STICKY BOTTOM BAR ═══ */}
      {isAuthorized && hasValidPrice && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] bg-white/95 backdrop-blur-xl border-t border-[var(--time-gray-100)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2.5 flex items-center gap-5">
            {/* Product info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden relative shrink-0 bg-[var(--time-gray-50)]">
                <Image
                  src={
                    galleryItems[0]?.thumbnail ||
                    data.image?.thumbnail ||
                    productPlaceholder
                  }
                  alt={data.name || ''}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[var(--time-dark)] truncate font-[family-name:var(--font-body)]">
                  {data.name}
                </div>
                <div className="text-[11px] text-[var(--time-gray-400)]">
                  {data.brand?.name} · {sku}
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 shrink-0">
              <span className="text-[22px] font-[900] text-[var(--time-dark)] font-[family-name:var(--font-heading)] tabular-nums">
                &euro;{Number(netPrice).toFixed(decimals)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-[13px] text-[var(--time-gray-400)] line-through tabular-nums">
                    &euro;{Number(listPrice).toFixed(decimals)}
                  </span>
                  <span className="text-[12px] font-bold text-[var(--time-red)]">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>

            {/* Cart */}
            <div className="shrink-0">
              <AddToCart
                lang={lang}
                product={data}
                priceData={erpPrice}
                showPlaceholder={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Spacer for sticky bar */}
      {isAuthorized && hasValidPrice && <div className="h-[70px]" />}
    </div>
  );
};

/* ─── Frequently Bought Together (static placeholder) ─── */

const BUNDLE_ITEMS = [
  {
    id: 'b1',
    name: "Borsa Termica 'Active'...",
    price: 15.4,
    oldPrice: 22.0,
    emoji: '👜',
  },
  {
    id: 'b2',
    name: 'Copertura Set Giardino...',
    price: 24.9,
    oldPrice: 35.0,
    emoji: '🛡️',
  },
  {
    id: 'b3',
    name: 'Lanterna LED da Giardi...',
    price: 12.9,
    oldPrice: 18.5,
    emoji: '🔴',
  },
  {
    id: 'b4',
    name: 'Irrigatore Oscillante ...',
    price: 28.9,
    oldPrice: null as number | null,
    emoji: '💧',
  },
];

function FrequentlyBoughtTogether({
  currentProduct,
  currentPrice,
  galleryItems,
}: {
  currentProduct: any;
  currentPrice: any;
  galleryItems: GalleryImage[];
}) {
  const mainPrice =
    currentPrice != null && Number(currentPrice) > 0 ? Number(currentPrice) : 0;
  const bundleTotal =
    mainPrice + BUNDLE_ITEMS.reduce((sum, i) => sum + i.price, 0);
  const bundleSavings = BUNDLE_ITEMS.reduce(
    (sum, i) => sum + ((i.oldPrice ?? i.price) - i.price),
    0,
  );
  const selectedCount = BUNDLE_ITEMS.length + 1;

  return (
    <div className="bg-white rounded-2xl border border-[var(--time-gray-100)] p-6 md:p-7 mb-12">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="text-[20px]">⚡</span>
        <h2 className="text-[18px] font-[800] text-[var(--time-dark)] font-[family-name:var(--font-heading)] tracking-[-0.02em]">
          Acquistati Insieme Frequentemente
        </h2>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Current product */}
        <div className="w-[160px] p-3.5 rounded-xl border-2 border-[var(--time-red)] bg-[rgba(230,57,70,0.03)] text-center shrink-0">
          <div className="w-16 h-16 mx-auto mb-2 relative rounded-lg overflow-hidden bg-gradient-to-br from-[var(--time-gray-50)] to-[#eef0f4]">
            <Image
              src={galleryItems[0]?.thumbnail || productPlaceholder}
              alt={currentProduct?.name || ''}
              fill
              sizes="64px"
              className="object-contain p-1"
            />
          </div>
          <div className="text-[11px] font-bold text-[var(--time-dark)] mb-1 whitespace-nowrap overflow-hidden text-ellipsis font-[family-name:var(--font-body)]">
            {(currentProduct?.name || '').slice(0, 25)}...
          </div>
          <div className="text-[15px] font-[800] text-[var(--time-dark)] tabular-nums">
            {mainPrice > 0 ? `€${mainPrice.toFixed(decimals)}` : '—'}
          </div>
          <div className="text-[9px] text-[var(--time-gray-400)] font-semibold mt-0.5 font-[family-name:var(--font-body)]">
            QUESTO PRODOTTO
          </div>
        </div>

        {/* Bundle items */}
        {BUNDLE_ITEMS.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <span className="text-[20px] text-[var(--time-gray-300)] font-light">
              +
            </span>
            <div className="w-[160px] p-3.5 rounded-xl border-[1.5px] border-[var(--time-gray-200)] bg-white text-center shrink-0 cursor-pointer transition-all hover:border-[var(--time-dark)]">
              <div className="text-[36px] mb-1.5">{item.emoji}</div>
              <div className="text-[11px] font-bold text-[var(--time-dark)] mb-1 whitespace-nowrap overflow-hidden text-ellipsis font-[family-name:var(--font-body)]">
                {item.name}
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[14px] font-[800] text-[var(--time-dark)] tabular-nums">
                  &euro;{item.price.toFixed(decimals)}
                </span>
                {item.oldPrice && (
                  <span className="text-[10px] text-[var(--time-gray-400)] line-through tabular-nums">
                    &euro;{item.oldPrice.toFixed(decimals)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Bundle total */}
        <div className="flex items-center gap-3 ml-2">
          <span className="text-[22px] text-[var(--time-gray-300)] font-light">
            =
          </span>
          <div className="p-4 px-5 rounded-xl bg-[var(--time-dark)] text-white text-center min-w-[160px]">
            <div className="text-[10px] opacity-60 font-medium mb-1">
              {selectedCount} prodotti selezionati
            </div>
            <div className="text-[24px] font-[900] font-[family-name:var(--font-heading)] tabular-nums">
              &euro;{bundleTotal.toFixed(decimals)}
            </div>
            {bundleSavings > 0 && (
              <div className="text-[11px] text-[#86efac] font-semibold mt-1">
                Risparmi &euro;{bundleSavings.toFixed(decimals)}
              </div>
            )}
            <button className="mt-2.5 w-full h-9 rounded-lg border-none bg-[var(--time-red)] text-white text-[12px] font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:brightness-110">
              Aggiungi tutti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Recently Bought By You (static placeholder) ─── */

const RECENTLY_BOUGHT = [
  {
    id: 'r1',
    name: 'Tavolo Pieghevole Resina',
    brand: 'Keter',
    date: '15 Mar',
    price: 89.9,
    emoji: '🪑',
  },
  {
    id: 'r2',
    name: 'Ombrellone da Giardino',
    brand: 'Bizzotto',
    date: '12 Mar',
    price: 149.0,
    emoji: '⛱️',
  },
  {
    id: 'r3',
    name: 'Set Posate Bambù',
    brand: 'EcoLiving',
    date: '8 Mar',
    price: 24.5,
    emoji: '🍴',
  },
];

function RecentlyBoughtByYou() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--time-gray-100)] p-5 md:p-6 mb-12">
      <div className="flex items-center gap-2 mb-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--time-gray-400)]"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <h3 className="text-[15px] font-[800] text-[var(--time-dark)] font-[family-name:var(--font-heading)]">
          Acquistati di Recente
        </h3>
      </div>
      <div className="flex gap-3">
        {RECENTLY_BOUGHT.map((item) => (
          <div
            key={item.id}
            className="flex-1 flex items-center gap-3.5 p-3 px-4 rounded-xl border border-[var(--time-gray-100)] cursor-pointer transition-all hover:border-[var(--time-gray-200)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            <div className="w-12 h-12 rounded-[10px] bg-gradient-to-br from-[var(--time-gray-50)] to-[#eef0f4] flex items-center justify-center text-[24px] shrink-0">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-[13px] font-bold text-[var(--time-dark)] whitespace-nowrap overflow-hidden text-ellipsis font-[family-name:var(--font-body)]">
                {item.name}
              </div>
              <div className="text-[11px] text-[var(--time-gray-400)]">
                {item.brand} · {item.date}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[14px] font-[800] text-[var(--time-dark)] tabular-nums">
                &euro;{item.price.toFixed(decimals)}
              </div>
              <button className="mt-1 text-[10px] font-bold text-[var(--time-red)] bg-transparent border-none cursor-pointer p-0 font-[family-name:var(--font-body)]">
                Riordina
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Trust Badge helper ─── */

function TrustBadge({ icon, text }: { icon: string; text: string }) {
  const iconSvg = {
    truck: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16,8 20,8 23,11 23,16 16,16" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    shield: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    box: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-1.5 text-[var(--time-gray-400)]">
      {iconSvg[icon as keyof typeof iconSvg]}
      <span className="text-[11px] text-[var(--time-gray-500)] font-medium font-[family-name:var(--font-body)]">
        {text}
      </span>
    </div>
  );
}

export default TimeProductDetail;
