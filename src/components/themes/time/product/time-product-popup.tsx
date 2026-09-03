'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@utils/routes';
import Image from '@components/ui/image';
import {
  IoIosHeart,
  IoIosHeartEmpty,
  IoIosArrowBack,
  IoIosArrowForward,
} from 'react-icons/io';
import {
  IoClose,
  IoChevronBack,
  IoArrowRedoOutline,
  IoArrowForwardOutline,
} from 'react-icons/io5';
import CopyableCode from '@components/themes/time/shared/copyable-code';
import {
  HiOutlinePrinter,
  HiOutlineSwitchHorizontal,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import { ReminderIcon, ReminderIconFilled } from '@components/icons/app-icons';
import { useCompareList } from '@/contexts/compare/compare.context';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { useProductPriceData } from '@framework/pricing';
import { selectBestPrice } from '@framework/pricing/best-price';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { useCatalogSettings } from '@/hooks/use-catalog-settings';
import { formatTimeAvailability } from './format-time-availability';
import { productPlaceholder } from '@assets/placeholders';
import { printProductDetail } from '@utils/print-product';
import { normalizeEan } from '@utils/ean';
import TimeVariantsGrid from './time-variants-grid';
import TimeOfferRows from './time-offer-rows';
import TimeShelfLabelButton from './time-shelf-label-button';
import { TimeStatusBadges, usePromoGating } from './time-promo-gated-cta';

type GalleryImage = {
  id?: string | number;
  original: string;
  thumbnail?: string;
  alt?: string;
};

export default function TimeProductPopup({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data: passedProduct, stack } = useModalState() as {
    data: any;
    stack: any[];
  };
  const { closeModal, goBack, closeAll } = useModalAction();
  const router = useRouter();

  const likes = useLikes();
  const reminders = useReminders();
  const { isAuthorized, hidePrices } = useUI();
  const { settings } = useHomeSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;
  const passedSku = String(passedProduct?.sku ?? '');

  /* ── Thin-product detection — when callers (e.g. cart drawer) hand us
       just a sku/image stub, fetch the full PIM product by sku so we get
       the real gallery, description, model, dimensions, variants, etc. ── */
  const isThinProduct =
    !!passedProduct &&
    (!Array.isArray(passedProduct.gallery) ||
      passedProduct.gallery.length === 0 ||
      !passedProduct.html_description);
  const { data: pimResults = [] } = usePimProductListQuery(
    { limit: 1, filters: { sku: passedSku ? [passedSku] : [] } },
    // Leaf product only — `groupByParent: true` would return the parent
    // and replace `id` with the parent's entity_code, breaking the ERP
    // price query for variant cart lines.
    { enabled: !!passedSku && isThinProduct, groupByParent: false },
  );
  const fetchedProduct = pimResults[0];

  /* Merge: prefer fetched fields, fall back to whatever the caller passed.
     Preserve the caller's `id` when it exists — it's the entity_code the
     ERP price query needs to key off. */
  const product = useMemo(() => {
    if (!passedProduct) return null;
    if (!fetchedProduct) return passedProduct;
    return {
      ...passedProduct,
      ...fetchedProduct,
      id: passedProduct.id || fetchedProduct.id,
    };
  }, [passedProduct, fetchedProduct]);

  const sku = String(product?.sku ?? '');
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

  const handleToggleCompare = useCallback(() => {
    if (!sku) return;
    if (hasSku(sku)) removeSkuFromCompare(sku);
    else addSkuToCompare(sku);
  }, [sku, hasSku, addSkuToCompare, removeSkuFromCompare]);

  /* ── Pricing: unified hook decides the source (inline / erp / hybrid) ── */
  const erpPrice = useProductPriceData(product);

  /* ── Derived price info ── */
  const anyPD = erpPrice as any;
  // Lowest of the listino and any qualifying promo — not the ERP's single
  // pre-selected improving_promo, which can be dearer than both.
  const best = selectBestPrice(erpPrice);
  const netPrice = erpPrice ? best.effectivePrice : null;
  const listPrice = anyPD?.price_gross ?? anyPD?.gross_price ?? null;
  const hasDiscount =
    netPrice != null &&
    listPrice != null &&
    Number(listPrice) > Number(netPrice) &&
    Number(netPrice) > 0;
  const discountTiers = erpPrice?.discount_description || '';
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(netPrice) / Number(listPrice)) * 100)
    : 0;
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
  const { hasMultiplePromos } = usePromoGating(erpPrice, product);

  /* ── Likes / Reminders init ── */
  useEffect(() => {
    if (!sku) return;
    likes.loadBulkStatus([sku]).catch(() => {});
    if (isAuthorized) reminders.loadBulkStatus([sku]).catch(() => {});
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

  const handlePrint = useCallback(() => {
    if (!product) return;
    printProductDetail(product, erpPrice, decimals);
  }, [product, erpPrice, decimals]);

  /* ── Gallery ── */
  const [activeImage, setActiveImage] = useState(0);
  const galleryItems = useMemo<GalleryImage[]>(() => {
    if (!product) return [];
    if (Array.isArray(product.gallery) && product.gallery.length > 0) {
      return product.gallery.map((item: any, i: number) => ({
        id: item.id ?? `img-${i}`,
        original: item.original ?? productPlaceholder,
        thumbnail: item.thumbnail ?? item.original ?? productPlaceholder,
        alt: item.alt ?? product.name ?? 'Product',
      }));
    }
    const fallback =
      product.image?.original ?? product.image?.thumbnail ?? productPlaceholder;
    return [
      {
        id: 'primary',
        original: fallback,
        thumbnail: product.image?.thumbnail ?? fallback,
        alt: product.name ?? 'Product',
      },
    ];
  }, [product]);

  function navigateToProductPage() {
    closeAll();
    router.push(
      `/${lang}${ROUTES.PRODUCT}?sku=${encodeURIComponent(product?.sku ?? '')}`,
    );
  }

  const fullWidth = true;

  if (!product) return null;

  /* ── Multi-variant parent: show variant grid ── */
  const variations = Array.isArray(product?.variations)
    ? product.variations
    : [];
  const isMultiVariantParent =
    (product.variantCount && product.variantCount > 1) || variations.length > 1;

  if (isMultiVariantParent) {
    return (
      <div className="h-full overflow-y-auto bg-white relative">
        {/* Accent bar */}
        <div className="sticky top-0 z-20 bg-brand text-white">
          <div
            className={cn(
              'flex items-center justify-between px-5 md:px-8 lg:px-10 py-3',
              !fullWidth && 'max-w-[1200px] mx-auto',
            )}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => (stack.length > 1 ? goBack() : closeModal())}
                className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer"
              >
                <IoChevronBack size={16} />
                {t('text-go-back', { defaultValue: 'Torna indietro' })}
              </button>
              <span className="hidden sm:inline text-white/40">|</span>
              <span className="hidden sm:inline text-white/90 text-sm font-medium">
                {t('text-product-variants', {
                  defaultValue: 'Anteprima varianti prodotto',
                })}
              </span>
            </div>
            <button
              onClick={closeModal}
              aria-label="Close"
              className="inline-flex items-center gap-2 bg-white text-[var(--time-red)] hover:bg-[var(--time-dark)] hover:text-white font-bold uppercase tracking-wide text-sm rounded-full px-4 py-2 shadow-lg ring-2 ring-white/80 transition-all cursor-pointer"
            >
              <IoClose size={20} strokeWidth={3} />
              <span className="hidden sm:inline">
                {t('text-close', { defaultValue: 'Chiudi' })}
              </span>
            </button>
          </div>
        </div>

        <div
          className={cn(
            'p-5 md:p-8 lg:p-10',
            !fullWidth && 'max-w-[1200px] mx-auto',
          )}
        >
          <TimeVariantsGrid
            lang={lang}
            product={product}
            onBrandClick={() => closeModal()}
          />
        </div>
      </div>
    );
  }

  /* ── Promo badge info ── */
  const bestPrice = selectBestPrice(erpPrice);
  const hasPromo = bestPrice.hasPromos || Boolean(product?.has_active_promo);
  // Name the promo that actually sets the price. When the listino undercuts
  // every promo the badge still shows (promos exist here), naming the cheapest.
  const promoName =
    bestPrice.promoTitles[0] ||
    t('text-on-offer', { defaultValue: 'In offerta' });
  const extraPromoCount = Math.max(bestPrice.promoTitles.length - 1, 0);

  return (
    <div className="h-full overflow-y-auto bg-white relative">
      {/* Accent bar */}
      <div className="sticky top-0 z-20 bg-brand text-white">
        <div className="max-w-[1200px] flex items-center justify-between px-5 md:px-8 lg:px-10 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (stack.length > 1 ? goBack() : closeModal())}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              <IoChevronBack size={16} />
              {t('text-go-back', { defaultValue: 'Torna indietro' })}
            </button>
            <span className="hidden sm:inline text-white/40">|</span>
            <span className="hidden sm:inline text-white/90 text-sm font-medium">
              {t('text-product-preview', {
                defaultValue: 'Anteprima prodotto',
              })}
            </span>
          </div>
          <button
            onClick={closeModal}
            aria-label="Close"
            className="inline-flex items-center gap-2 bg-white text-[var(--time-red)] hover:bg-[var(--time-dark)] hover:text-white font-bold uppercase tracking-wide text-sm rounded-full px-4 py-2 shadow-lg ring-2 ring-white/80 transition-all cursor-pointer"
          >
            <IoClose size={20} strokeWidth={3} />
            <span className="hidden sm:inline">
              {t('text-close', { defaultValue: 'Chiudi' })}
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] p-5 md:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-10">
          {/* ── LEFT: Gallery ── */}
          <div>
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--time-gray-50)] to-[#eef0f4] border border-[var(--time-gray-100)]">
              <div className="aspect-square relative">
                <Image
                  src={
                    galleryItems[activeImage]?.original || productPlaceholder
                  }
                  alt={galleryItems[activeImage]?.alt || 'Product'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>

              {/* Badges */}
              {!hidePrices && (discountPercent > 0 || hasPromo) && (
                <div className="absolute top-4 left-4 flex flex-col gap-2 items-start max-w-[75%]">
                  {discountPercent > 0 && (
                    <span className="bg-[var(--time-red)] text-white text-[13px] font-extrabold px-3.5 py-1.5 rounded-lg font-[family-name:var(--font-body)]">
                      {discountTiers || `-${discountPercent}%`}
                    </span>
                  )}
                  {hasPromo && discountPercent === 0 && (
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
                          (prev - 1 + galleryItems.length) %
                          galleryItems.length,
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
              <div className="flex gap-2 mt-3">
                {galleryItems.slice(0, 6).map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(idx)}
                    className={cn(
                      'w-16 h-16 rounded-[8px] overflow-hidden cursor-pointer transition-all relative shrink-0',
                      activeImage === idx
                        ? 'border-2 border-[var(--time-red)] shadow-[0_0_0_2px_rgba(230,57,70,0.15)]'
                        : 'border-[1.5px] border-[var(--time-gray-200)] hover:border-[var(--time-gray-400)]',
                    )}
                  >
                    <Image
                      src={img.thumbnail || productPlaceholder}
                      alt={img.alt || ''}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div className="flex flex-col">
            {/* SKU (primary) · Brand (secondary) */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-sm sm:text-base font-bold text-[var(--time-dark)] font-mono shrink-0">
                {sku}
              </span>
              {sku && product.brand?.name && (
                <span className="text-sm sm:text-base text-[var(--time-gray-300)]">
                  ·
                </span>
              )}
              {product.brand?.name && (
                <span className="text-xs sm:text-sm font-bold text-[var(--time-red)] uppercase tracking-wider font-[family-name:var(--font-body)] truncate">
                  {product.brand.name as string}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-[22px] lg:text-2xl font-[800] text-[var(--time-dark)] font-[family-name:var(--font-heading)] tracking-[-0.02em] leading-tight mb-2">
              {product.name}
            </h2>

            {/* View full product link */}
            <button
              type="button"
              onClick={navigateToProductPage}
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white mb-4 cursor-pointer bg-[var(--time-red)] hover:bg-[var(--time-dark)] border-none px-4 py-2 rounded-full shadow-md transition-colors font-[family-name:var(--font-body)]"
            >
              {t('text-view-full-product', {
                defaultValue: 'Vedi scheda completa',
              })}
              <IoArrowForwardOutline size={16} />
            </button>

            {/* Description */}
            {product.description && (
              <p className="text-[13px] sm:text-sm text-[var(--time-gray-600)] leading-[1.6] mb-4 font-[family-name:var(--font-body)] line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Quick specs */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 p-3 rounded-xl bg-[var(--time-gray-50)] border border-[var(--time-gray-100)] mb-4 text-xs sm:text-[13px]">
              {sku && (
                <>
                  <span className="text-[var(--time-gray-400)] font-medium">
                    {t('text-product-code', {
                      defaultValue: 'Codice Prodotto',
                    })}
                  </span>
                  <CopyableCode value={String(sku).toUpperCase()} />
                </>
              )}
              {product.parent_sku &&
                String(product.parent_sku) !== String(sku) && (
                  <>
                    <span className="text-[var(--time-gray-400)] font-medium">
                      {t('text-figure-code', {
                        defaultValue: 'Codice Figura',
                      })}
                    </span>
                    <CopyableCode
                      value={String(product.parent_sku).toUpperCase()}
                    />
                  </>
                )}
              {product.model && (
                <>
                  <span className="text-[var(--time-gray-400)] font-medium">
                    {t('text-model', { defaultValue: 'Modello' })}
                  </span>
                  <span className="font-bold text-[var(--time-dark)]">
                    {product.model as string}
                  </span>
                </>
              )}
              {product.weight != null && (
                <>
                  <span className="text-[var(--time-gray-400)] font-medium">
                    {t('text-weight', { defaultValue: 'Peso' })}
                  </span>
                  <span className="font-bold text-[var(--time-dark)]">
                    {product.weight as number}{' '}
                    {(product.weight_uom as string) || 'kg'}
                  </span>
                </>
              )}
              {product.volume != null && (
                <>
                  <span className="text-[var(--time-gray-400)] font-medium">
                    {t('text-volume', { defaultValue: 'Volume' })}
                  </span>
                  <span className="font-bold text-[var(--time-dark)]">
                    {product.volume as number}{' '}
                    {(product.volume_uom as string) || 'cm³'}
                  </span>
                </>
              )}
              {hasAvailability && (
                <>
                  <span className="text-[var(--time-gray-400)] font-medium">
                    {t('text-status', { defaultValue: 'Stato' })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-[6px] h-[6px] rounded-full inline-block"
                      style={{
                        background: isOutOfStock ? '#dc2626' : '#059669',
                      }}
                    />
                    <span
                      className="font-bold text-xs sm:text-[13px]"
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
                  product={product}
                  hasMultiplePromos={hasMultiplePromos}
                  onPromoClick={navigateToProductPage}
                  t={t}
                />
              </div>
            </div>

            {/* LISTINO + per-PROMO addable rows */}
            {isAuthorized && hasValidPrice && (
              <div className="mb-4">
                <TimeOfferRows
                  lang={lang}
                  product={product}
                  priceData={erpPrice}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isAuthorized && (
                <button
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className="h-[36px] px-3 rounded-[8px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-[11px] sm:text-xs font-semibold flex items-center gap-[6px] cursor-pointer transition-colors hover:border-[var(--time-red)] hover:text-[var(--time-red)] disabled:opacity-50 font-[family-name:var(--font-body)]"
                  style={{
                    color: favorite
                      ? 'var(--time-red)'
                      : 'var(--time-gray-600)',
                  }}
                >
                  {favorite ? (
                    <IoIosHeart size={14} />
                  ) : (
                    <IoIosHeartEmpty size={14} />
                  )}
                  {favorite
                    ? t('text-favorited', { defaultValue: 'Preferito' })
                    : t('text-wishlist', { defaultValue: 'Preferiti' })}
                </button>
              )}
              {isAuthorized && (isOutOfStock || hasReminder) && (
                <button
                  onClick={async () => {
                    if (!sku) return;
                    setReminderLoading(true);
                    try {
                      await reminders.toggle(sku);
                    } finally {
                      setReminderLoading(false);
                    }
                  }}
                  disabled={reminderLoading}
                  className="h-[36px] px-3 rounded-[8px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-[11px] sm:text-xs font-semibold flex items-center gap-[6px] cursor-pointer transition-colors hover:border-yellow-500 hover:text-yellow-500 disabled:opacity-50 font-[family-name:var(--font-body)]"
                  style={{
                    color: hasReminder ? '#eab308' : 'var(--time-gray-600)',
                  }}
                >
                  {hasReminder ? (
                    <ReminderIconFilled size={14} />
                  ) : (
                    <ReminderIcon size={14} />
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
                className="h-[36px] px-3 rounded-[8px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-[11px] sm:text-xs font-semibold flex items-center gap-[6px] cursor-pointer transition-colors hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50 font-[family-name:var(--font-body)]"
                style={{
                  color: isInCompare ? '#059669' : 'var(--time-gray-600)',
                  borderColor: isInCompare ? '#6ee7b7' : undefined,
                }}
              >
                {isInCompare ? (
                  <HiOutlineCheckCircle size={14} />
                ) : (
                  <HiOutlineSwitchHorizontal size={14} />
                )}
                {isInCompare
                  ? t('text-in-compare', { defaultValue: 'Confronto' })
                  : t('text-compare', { defaultValue: 'Confronta' })}
              </button>
              <button
                onClick={() => {
                  if (typeof navigator.share === 'function') {
                    navigator.share({
                      title: product.name,
                      url: window.location.href,
                    });
                  }
                }}
                className="h-[36px] px-3 rounded-[8px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-[11px] sm:text-xs font-semibold text-[var(--time-gray-600)] flex items-center gap-[6px] cursor-pointer transition-colors hover:border-[var(--time-gray-400)] font-[family-name:var(--font-body)]"
              >
                <IoArrowRedoOutline size={14} />
                {t('text-share', { defaultValue: 'Condividi' })}
              </button>
              <button
                onClick={handlePrint}
                className="h-[36px] px-3 rounded-[8px] border-[1.5px] border-[var(--time-gray-200)] bg-white text-[11px] sm:text-xs font-semibold text-[var(--time-gray-600)] flex items-center gap-[6px] cursor-pointer transition-colors hover:border-[var(--time-gray-400)] font-[family-name:var(--font-body)]"
              >
                <HiOutlinePrinter size={14} />
                {t('text-print', { defaultValue: 'Stampa' })}
              </button>
              <TimeShelfLabelButton
                lang={lang}
                name={String(product?.name ?? '')}
                sku={sku}
                ean={normalizeEan(product?.ean)}
                size="compact"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
