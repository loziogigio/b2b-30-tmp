'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import Image from '@components/ui/image';
import CopyableCode from '@components/themes/time/shared/copyable-code';
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
import TimeOfferRows from './time-offer-rows';
import { TimeStatusBadges, usePromoGating } from './time-promo-gated-cta';
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
  const { isAuthorized, hidePrices } = useUI();
  const inPageCartRef = useRef<HTMLDivElement | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const el = inPageCartRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show the sticky bar only after the user has scrolled past
        // the in-page AddToCart (it's no longer intersecting AND its bottom
        // is above the viewport top).
        const rect = entry.boundingClientRect;
        setShowStickyBar(!entry.isIntersecting && rect.bottom <= 0);
      },
      { threshold: 0, rootMargin: '0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
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
  const discountTiers = erpPrice?.discount_description || '';
  const hasValidPrice = erpPrice && netPrice != null && Number(netPrice) > 0;
  const isOutOfStock = erpPrice ? Number(erpPrice.availability) <= 0 : false;
  const { hasMultiplePromos } = usePromoGating(erpPrice, data);

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
            {((!hidePrices && discountPercent > 0) || promoLabel) && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                {!hidePrices && discountPercent > 0 && (
                  <span className="bg-[var(--time-red)] text-white text-[13px] font-extrabold px-3.5 py-1.5 rounded-lg font-[family-name:var(--font-body)] tabular-nums">
                    {discountTiers || `-${discountPercent}%`}
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
            {sku && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-product-code', {
                    defaultValue: 'Codice Prodotto',
                  })}
                </span>
                <CopyableCode
                  value={String(sku).toUpperCase()}
                  className="text-xs sm:text-[13px]"
                />
              </>
            )}
            {data?.parent_sku && String(data.parent_sku) !== String(sku) && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-figure-code', {
                    defaultValue: 'Codice Figura',
                  })}
                </span>
                <CopyableCode
                  value={String(data.parent_sku).toUpperCase()}
                  className="text-xs sm:text-[13px]"
                />
              </>
            )}
            {data.model && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-model', { defaultValue: 'Modello' })}
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-[var(--time-dark)]">
                  {data.model as string}
                </span>
              </>
            )}
            {data.weight != null && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-weight', { defaultValue: 'Peso' })}
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-[var(--time-dark)]">
                  {data.weight as number} {(data.weight_uom as string) || 'kg'}
                </span>
              </>
            )}
            {data.volume != null && (
              <>
                <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] font-medium">
                  {t('text-volume', { defaultValue: 'Volume' })}
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-[var(--time-dark)]">
                  {data.volume as number} {(data.volume_uom as string) || 'cm³'}
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
            <div className="col-span-2">
              <TimeStatusBadges
                priceData={erpPrice}
                product={data}
                hasMultiplePromos={hasMultiplePromos}
                onPromoClick={() => {
                  const el = document.getElementById('time-offer-rows');
                  el?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }}
                t={t}
              />
            </div>
          </div>

          {/* LISTINO + per-PROMO addable rows */}
          {isAuthorized && hasValidPrice && (
            <div
              id="time-offer-rows"
              ref={inPageCartRef}
              className="mb-4 scroll-mt-24"
            >
              <TimeOfferRows lang={lang} product={data} priceData={erpPrice} />
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
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <TimeProductTabs lang={lang} product={data} zone3Blocks={zone3Blocks} />

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

      {/* ═══ STICKY BOTTOM BAR — only when scrolled past the in-page Add-to-Cart ═══ */}
      {isAuthorized && hasValidPrice && (
        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-[90] bg-white/95 backdrop-blur-xl border-t border-[var(--time-gray-100)] shadow-[0_-6px_24px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out',
            showStickyBar
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : 'translate-y-full opacity-0 pointer-events-none',
          )}
          aria-hidden={!showStickyBar}
        >
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3 flex items-center gap-4 md:gap-6">
            {/* Product info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-lg overflow-hidden relative shrink-0 bg-[var(--time-gray-50)] border border-[var(--time-gray-100)]">
                <Image
                  src={
                    galleryItems[0]?.thumbnail ||
                    data.image?.thumbnail ||
                    productPlaceholder
                  }
                  alt={data.name || ''}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[var(--time-dark)] truncate font-[family-name:var(--font-body)]">
                  {data.name}
                </div>
                <div className="text-[11px] text-[var(--time-gray-400)] truncate">
                  {data.brand?.name ? `${data.brand.name} · ` : ''}
                  {sku}
                </div>
              </div>
            </div>

            {/* Price */}
            {!hidePrices && (
              <div className="hidden sm:flex items-baseline gap-2 shrink-0">
                <span className="text-[22px] font-[900] text-[var(--time-dark)] font-[family-name:var(--font-heading)] tabular-nums tracking-[-0.02em]">
                  &euro;{Number(netPrice).toFixed(decimals)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-[13px] text-[var(--time-gray-400)] line-through tabular-nums">
                      &euro;{Number(listPrice).toFixed(decimals)}
                    </span>
                    <span className="text-[11px] font-bold text-white bg-[var(--time-red)] px-2 py-0.5 rounded-md">
                      -{discountPercent}%
                    </span>
                  </>
                )}
              </div>
            )}

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
    </div>
  );
};

export default TimeProductDetail;
