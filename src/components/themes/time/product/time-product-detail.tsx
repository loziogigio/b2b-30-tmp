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
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { useProductPriceData } from '@framework/pricing';
import { selectBestPrice } from '@framework/pricing/best-price';
import { buildCartPriceData } from '@components/product/b2b-offer-rows';
import { useUI } from '@contexts/ui.context';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { productPlaceholder } from '@assets/placeholders';
import AddToCart from '@components/product/add-to-cart';
import TimeOfferRows from './time-offer-rows';
import { TimeStatusBadges, usePromoGating } from './time-promo-gated-cta';
import TimeProductTabs from './time-product-tabs';
import TimeBarcodeButton from './time-barcode-button';
import CorrelatedProductsCarousel from '@components/product/feeds/correlated-products-carousel';
import TimeVariantsGrid from './time-variants-grid';
import ProductJsonLd from '@components/seo/product-json-ld';
import { printProductDetail } from '@utils/print-product';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { useCatalogSettings } from '@/hooks/use-catalog-settings';
import { formatTimeAvailability } from './format-time-availability';
import { useProductReturn } from '@/hooks/use-product-return';
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
import { verifyPromoItem } from '@/hooks/use-coupon';
import { ERP_STATIC } from '@framework/utils/static';
import { normalizeEan } from '@utils/ean';
import cn from 'classnames';

import type { PageBlock } from '@/lib/types/blocks';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import DynamicBlocksSection, {
  selectSectionBlocks,
} from '@components/product/dynamic-blocks/DynamicBlocksSection';
import type { DynamicBlock } from '@framework/types';

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
  siteUrl?: string;
  canonicalUrl?: string;
  suppressProductJsonLd?: boolean;
}> = ({
  lang,
  search,
  blocks = [],
  siteUrl,
  canonicalUrl,
  suppressProductJsonLd,
}) => {
  const { t } = useTranslation(lang, 'common');
  const onReturn = useProductReturn(lang);

  /* ── Zone blocks ── */
  const zone3Blocks = blocks.filter((b) => b.zone === 'zone3');
  const zone4Blocks = blocks.filter((b) => b.zone === 'zone4');

  /* ── PIM product data ── */
  const skuToSearch = search?.sku ? [search.sku] : [];
  const { data: pimResults = [], isLoading } = usePimProductListQuery(
    { limit: 1, filters: { sku: skuToSearch }, include_dynamic_blocks: true },
    { enabled: skuToSearch.length > 0, groupByParent: true },
  );

  const skuNotFound =
    !isLoading && skuToSearch.length > 0 && pimResults.length === 0;
  const { data: parentSkuResults = [] } = usePimProductListQuery(
    {
      limit: 200,
      filters: { parent_sku: skuToSearch },
      include_dynamic_blocks: true,
    },
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

  // Per-product dynamic blocks (separate system from PageBlock zones).
  const dynamicBlocks = (data as any)?.dynamic_blocks as
    | DynamicBlock[]
    | undefined;
  const dynamicSection3Blocks = selectSectionBlocks(dynamicBlocks, lang, 3);

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

  // Multi-variant parents render their variants grid; for everything else,
  // the active pricingSource (inline / erp / hybrid) decides the slice.
  const erpPrice = useProductPriceData(data, {
    enabled: !isMultiVariantParent,
  });

  /* ── Derived price info ── */
  const anyPD = erpPrice as any;
  // The one price this page shows AND books: min(listino, cheapest qualifying
  // promo). `price_discount` alone is not it — the ERP flattens its
  // pre-selected `improving_promo` there, which on a multi-promo SKU (or when
  // the listino undercuts every promo) is not the price `buildCartPriceData`
  // charges below.
  const bestPrice = selectBestPrice(erpPrice);
  // A non-positive effective price is NO PRICE, not a cue to fall back: the
  // booking layer would book `net_price = effectivePrice = 0` (free goods), so
  // showing `price_discount` / `price_gross` here would display a number
  // nothing charges. Hide the price and the add button instead.
  const netPrice =
    bestPrice.effectivePrice > 0 ? bestPrice.effectivePrice : null;
  const listPrice = anyPD?.price_gross ?? anyPD?.gross_price ?? null;
  const hasDiscount =
    netPrice != null &&
    listPrice != null &&
    Number(listPrice) > Number(netPrice) &&
    Number(netPrice) > 0;
  const discountTiers = erpPrice?.discount_description || '';
  const hasValidPrice = erpPrice && netPrice != null && Number(netPrice) > 0;
  const availability = Number(erpPrice?.availability);
  const hasAvailability =
    isAuthorized &&
    erpPrice?.availability != null &&
    Number.isFinite(availability);
  const isOutOfStock = hasAvailability && availability <= 0;
  const { settings: catalogSettings } = useCatalogSettings();
  const availInfo = formatTimeAvailability(
    erpPrice,
    catalogSettings.availabilityDisplay,
    t,
  );
  const { hasMultiplePromos } = usePromoGating(erpPrice, data);

  /* ── Likes / Reminders ── */
  const likes = useLikes();
  const reminders = useReminders();
  const sku = String(data?.sku ?? '');

  // Shelf label. `isFromParentSearch` builds a synthetic parent by spreading a
  // CHILD record and overwriting only `sku` — so its `ean` belongs to a
  // different article than its code. A label pairing one product's code with
  // another's barcode scans as the wrong goods at the till, so refuse to offer
  // one for that shape.
  const ean = isFromParentSearch ? '' : normalizeEan(data?.ean);

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

  /* ── Per-article base promo (MyMB GetPromozioneBaseXArticolo) ──
   * DISABLED for now (2026-06-12): GetPromozioneBaseXArticolo does TO_NUMBER on
   * codiceInternoArticolo (ORA-06502) so it can't handle this tenant's
   * alphanumeric article codes (e.g. CB0134-0WA), and the base discount is
   * already carried by GetPrezzaturaMultipla's `discount[]`. Flip to true to
   * re-enable once MyMB tolerates non-numeric article codes. */
  const ENABLE_BASE_PROMO = false;
  const [basePromo, setBasePromo] = useState<any | null>(null);
  useEffect(() => {
    if (!ENABLE_BASE_PROMO) return;
    verifyPromoItem(
      String(ERP_STATIC.customer_code || ''),
      String(ERP_STATIC.address_code || ''),
      String(data?.id || ''),
    ).then(setBasePromo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

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
        {/*
         * Section 1 (sidebar dynamic blocks) and section 2 (below-gallery dynamic blocks)
         * are intentionally NOT rendered in the multi-variant parent layout: that layout
         * has no product sidebar and no single-product gallery — only section 3 (rendered
         * as tabs inside TimeProductTabs) and section 4 (below tabs) apply here.
         */}
        <TimeProductTabs
          lang={lang}
          product={data}
          zone3Blocks={zone3Blocks}
          dynamicSection3Blocks={dynamicSection3Blocks}
          className="mb-8"
        />
        <DynamicBlocksSection
          blocks={dynamicBlocks}
          lang={lang}
          section={4}
          className="mb-8 space-y-6"
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
  // The cart must book the price the page shows: substitute the winning promo
  // (or strip the ERP's flattened promo identity when the listino wins).
  // `bestPrice` is hoisted above the derived-price block — it now drives the
  // headline too, so display and booking cannot drift apart.
  const cartPriceData = erpPrice ? buildCartPriceData(erpPrice) : undefined;
  const hasPromo = bestPrice.hasPromos || Boolean(data?.has_active_promo);
  // Name the promo that actually sets the price. When the listino undercuts
  // every promo the badge still shows (promos exist here), naming the cheapest.
  const promoName =
    bestPrice.promoTitles[0] ||
    t('text-on-offer', { defaultValue: 'In offerta' });
  const extraPromoCount = Math.max(bestPrice.promoTitles.length - 1, 0);

  return (
    <div className="pt-7 pb-16">
      {!suppressProductJsonLd ? (
        <ProductJsonLd
          product={data}
          priceData={erpPrice}
          lang={lang}
          siteUrl={siteUrl}
          canonicalUrl={canonicalUrl}
        />
      ) : null}

      {/* Return — back to where the user came from, else the catalog */}
      <button
        type="button"
        onClick={onReturn}
        className="mb-5 inline-flex items-center gap-2 h-[38px] px-4 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] bg-white text-[12px] font-semibold text-[var(--time-gray-600)] transition-colors hover:border-[var(--time-dark)] hover:text-[var(--time-dark)] cursor-pointer"
      >
        <IoIosArrowBack size={16} />
        {t('text-go-back', { defaultValue: 'Torna indietro' })}
      </button>

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
            {((!hidePrices && discountPercent > 0) || hasPromo) && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 items-start max-w-[75%]">
                {!hidePrices && discountPercent > 0 && (
                  <span className="bg-[var(--time-red)] text-white text-[13px] font-extrabold px-3.5 py-1.5 rounded-lg font-[family-name:var(--font-body)] tabular-nums">
                    {discountTiers || `-${discountPercent}%`}
                  </span>
                )}
                {hasPromo && (
                  <span className="inline-flex items-center gap-1.5 bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-md tracking-wide max-w-full">
                    <span className="truncate">{promoName}</span>
                    {extraPromoCount > 0 && (
                      <span className="shrink-0 rounded bg-white/20 px-1.5 py-[1px] tabular-nums">
                        +{extraPromoCount}
                      </span>
                    )}
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
          {/* SKU (primary) · Brand (secondary) */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <button
              onClick={copySkuToClipboard}
              className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-[var(--time-dark)] cursor-pointer hover:text-[var(--time-red)] transition-colors font-mono shrink-0"
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
            {sku && data.brand?.name && (
              <span className="text-sm sm:text-base text-[var(--time-gray-300)]">
                ·
              </span>
            )}
            {data.brand?.name && (
              <span className="text-xs sm:text-sm font-bold text-[var(--time-red)] uppercase tracking-wider font-[family-name:var(--font-body)] truncate">
                {data.brand.name}
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
            {hasAvailability && (
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
                    {availInfo.label}
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

          {/* Per-article base promo (MyMB GetPromozioneBaseXArticolo) */}
          {process.env.NODE_ENV !== 'production' && basePromo && (
            <div className="mb-4 rounded-lg border border-[var(--time-gray-200)] bg-[var(--time-gray-50)] px-4 py-3 text-[13px] text-[var(--time-dark)]">
              {/* Shape depends on GetPromozioneBaseXArticolo; render the message/fields
                  the backend returns. Start by surfacing the raw result for QA, then
                  refine the markup once a real response is observed. */}
              <pre className="whitespace-pre-wrap text-[11px] text-[var(--time-gray-600)]">
                {JSON.stringify(basePromo, null, 2)}
              </pre>
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
            <TimeBarcodeButton lang={lang} sku={sku} ean={ean} />
          </div>

          {/* Section 1: per-product dynamic blocks (sidebar, below action buttons) */}
          <DynamicBlocksSection
            blocks={dynamicBlocks}
            lang={lang}
            section={1}
            className="pt-4 space-y-6"
          />
        </div>
      </div>

      {/* Section 2: per-product dynamic blocks (after gallery/info grid, full width) */}
      <DynamicBlocksSection
        blocks={dynamicBlocks}
        lang={lang}
        section={2}
        className="mb-12 space-y-6"
      />

      {/* ═══ TABS ═══ */}
      <TimeProductTabs
        lang={lang}
        product={data}
        zone3Blocks={zone3Blocks}
        dynamicSection3Blocks={dynamicSection3Blocks}
      />

      {/* Section 4: per-product dynamic blocks (below tabs, full width) */}
      <DynamicBlocksSection
        blocks={dynamicBlocks}
        lang={lang}
        section={4}
        className="mb-12 space-y-6"
      />

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
                priceData={cartPriceData}
                className="time-stepper time-stepper-color"
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
