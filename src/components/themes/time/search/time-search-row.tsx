'use client';

import Link from '@components/ui/link';
import Image from '@components/ui/image';
import { Product } from '@framework/types';
import { useProductOpen } from '@/hooks/use-product-open';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import { buildPackagingParts } from '@utils/packaging';
import { useProductPriceData } from '@framework/pricing';
import { selectBestPrice } from '@framework/pricing/best-price';
import { buildCartPriceData } from '@components/product/b2b-offer-rows';
import AddToCart from '@components/product/add-to-cart';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { useCatalogSettings } from '@/hooks/use-catalog-settings';
import { formatTimeAvailability } from '@components/themes/time/product/format-time-availability';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import { ReminderIcon, ReminderIconFilled } from '@components/icons/app-icons';
import {
  hasActivePromo,
  PromoGatedCta,
  TimeStatusBadges,
  usePromoGating,
} from '@components/themes/time/product/time-promo-gated-cta';
import React from 'react';

interface TimeSearchRowProps {
  product: Product & { variantCount?: number };
  lang: string;
  priceData?: ErpPriceData;
  index?: number;
}

export default function TimeSearchRow({
  product,
  lang,
  priceData: priceDataProp,
  index = 0,
}: TimeSearchRowProps) {
  const { name, image, sku, brand, parent_sku, description, model } =
    product ?? {};
  // Phase 2.1: list surfaces no longer fetch ERP prices. Route through the
  // unified pricing hook so the slice is synthesized from PIM inline pricing
  // (or fetched per the active source flag). A caller-provided priceData
  // still wins as an explicit override.
  const priceData = useProductPriceData(product, { override: priceDataProp });
  const openProduct = useProductOpen(lang);
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized, hidePrices } = useUI();
  const { settings } = useHomeSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;
  const likes = useLikes();
  const reminders = useReminders();
  const isFavorite = sku ? likes.isLiked(sku) : false;
  const hasReminder = sku ? reminders.hasReminder(sku) : false;
  const [likeLoading, setLikeLoading] = React.useState(false);
  const [reminderLoading, setReminderLoading] = React.useState(false);

  const variations = Array.isArray(product?.variations)
    ? product.variations
    : [];
  const hasVariants =
    (product.variantCount && product.variantCount > 1) || variations.length > 1;

  const anyPD = priceData as any;
  // Lowest of the listino and any qualifying promo — not the ERP's single
  // pre-selected improving_promo, which can be dearer than both.
  const best = selectBestPrice(priceData);
  const netPrice = priceData ? best.effectivePrice : null;
  // The cart must book the price the row shows: substitute the winning promo
  // (or strip the ERP's flattened promo identity when the listino wins).
  const cartPriceData = priceData ? buildCartPriceData(priceData) : undefined;
  const listPrice = anyPD?.price_gross ?? anyPD?.gross_price ?? null;
  const hasDiscount =
    netPrice != null &&
    listPrice != null &&
    Number(listPrice) > Number(netPrice) &&
    Number(netPrice) > 0;
  const discountTiers = priceData?.discount_description || '';
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(netPrice) / Number(listPrice)) * 100)
    : 0;

  const availability = Number(priceData?.availability);
  const hasAvailability =
    isAuthorized &&
    priceData?.availability != null &&
    Number.isFinite(availability);
  const isOutOfStock = hasAvailability && availability <= 0;
  const { settings: catalogSettings } = useCatalogSettings();
  const availInfo = formatTimeAvailability(
    priceData,
    catalogSettings.availabilityDisplay,
    t,
  );
  // Legacy PvQuantityInput.vue gating + cart-total readout. When a promo
  // gates direct add (multiple promos, or a non-improving threshold promo)
  // we replace the inline qty selector with a PROMO CTA that opens the
  // preview/promo modal instead.
  const { hasMultiplePromos, isPromoGated, canInlineAdd, cartQty } =
    usePromoGating(priceData, product);
  const variantCount = product.variantCount ?? variations.length;
  // Packaging info from ERP — filtered set (packaging_options_id), shared with
  // the offer rows. Renders "UM: <unit> · <code>: <qty> · …".
  const packagingParts = priceData ? buildPackagingParts(priceData) : [];

  function handleClick() {
    openProduct(product, !!hasVariants);
  }

  return (
    <article
      className="bg-white rounded-[var(--radius-card)] border border-[var(--time-gray-100)] overflow-hidden flex items-stretch transition-shadow duration-[250ms] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      style={{
        animation: `time-fadeUp 0.35s ease ${index * 0.04}s both`,
      }}
    >
      {/* Image */}
      <div
        className="w-[150px] aspect-square self-center bg-gradient-to-br from-[var(--time-gray-50)] to-[var(--time-gray-100)] shrink-0 relative cursor-pointer"
        onClick={handleClick}
      >
        <Image
          src={
            image?.thumbnail && image.thumbnail.trim() !== ''
              ? image.thumbnail
              : productPlaceholder
          }
          alt={name || 'Product'}
          quality={100}
          fill
          sizes="150px"
          className="object-contain pointer-events-none"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {parent_sku && (
            <span className="bg-[var(--time-dark)] text-white text-[10px] sm:text-[11px] font-bold px-1.5 py-[2px] rounded font-mono">
              {parent_sku}
            </span>
          )}
          {!hidePrices && discountPercent > 0 && (
            <span className="bg-[var(--time-red)] text-white text-[10px] sm:text-[11px] font-bold px-1.5 py-[2px] rounded font-[family-name:var(--font-body)]">
              {discountTiers || `-${discountPercent}%`}
            </span>
          )}
          {!hidePrices &&
            hasActivePromo(product, priceData) &&
            discountPercent === 0 && (
              <span className="bg-[var(--time-red)] text-white text-[10px] sm:text-[11px] font-bold px-1.5 py-[2px] rounded font-[family-name:var(--font-body)]">
                PROMO
              </span>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-[13px] font-bold text-[var(--time-dark)] font-mono">
                {sku || parent_sku || ''}
              </span>
              {(sku || parent_sku) && brand?.name && (
                <span className="text-[11px] sm:text-xs text-[var(--time-gray-300)]">
                  ·
                </span>
              )}
              {brand?.name && (brand as any)?.brand_id ? (
                <Link
                  href={`/${lang}/search?filters-brand_id=${(brand as any).brand_id}`}
                  className="text-xs sm:text-[13px] font-bold text-[var(--time-red)] font-[family-name:var(--font-body)] uppercase tracking-[0.06em] hover:underline"
                >
                  {brand.name}
                </Link>
              ) : brand?.name ? (
                <span className="text-xs sm:text-[13px] font-bold text-[var(--time-red)] font-[family-name:var(--font-body)] uppercase tracking-[0.06em]">
                  {brand.name}
                </span>
              ) : null}
              {hasVariants && variantCount > 1 && (
                <span className="bg-[var(--time-gray-100)] text-[var(--time-gray-600)] text-[11px] sm:text-xs font-semibold px-2 py-[2px] rounded font-[family-name:var(--font-body)]">
                  {variantCount} varianti
                </span>
              )}
            </div>
            <h3
              className="text-[15px] sm:text-base font-bold text-[var(--time-dark)] leading-[1.3] font-[family-name:var(--font-body)] cursor-pointer"
              onClick={handleClick}
            >
              {name || 'Product'}
            </h3>
            {model && (
              <p className="!mb-0 text-xs sm:text-[13px] font-bold text-[var(--time-dark)] font-[family-name:var(--font-body)] truncate">
                {model}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isAuthorized && (
              <div className="flex items-center gap-0.5">
                {(isOutOfStock || hasReminder) && (
                  <button
                    type="button"
                    aria-label="Toggle reminder"
                    className={`shrink-0 p-0.5 rounded transition-colors ${hasReminder ? 'text-yellow-500' : 'text-[var(--time-gray-400)] hover:text-yellow-500'}`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!sku) return;
                      setReminderLoading(true);
                      try {
                        await reminders.toggle(sku);
                      } finally {
                        setReminderLoading(false);
                      }
                    }}
                    disabled={reminderLoading || !sku}
                  >
                    {hasReminder ? (
                      <ReminderIconFilled className="text-[16px]" />
                    ) : (
                      <ReminderIcon className="text-[16px]" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Toggle wishlist"
                  className={`shrink-0 p-0.5 rounded transition-colors ${isFavorite ? 'text-[var(--time-red)]' : 'text-[var(--time-gray-400)] hover:text-[var(--time-red)]'}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!sku) return;
                    setLikeLoading(true);
                    try {
                      await likes.toggle(sku);
                    } finally {
                      setLikeLoading(false);
                    }
                  }}
                  disabled={likeLoading || !sku}
                >
                  {isFavorite ? (
                    <IoIosHeart className="text-[16px]" />
                  ) : (
                    <IoIosHeartEmpty className="text-[16px]" />
                  )}
                </button>
              </div>
            )}
            {(brand as any)?.logo_url &&
              (brand as any).logo_url.trim() !== '' &&
              (brand as any)?.brand_id && (
                <Link
                  href={`/${lang}/search?filters-brand_id=${(brand as any).brand_id}`}
                  className="block w-[72px] h-[36px] sm:w-[88px] sm:h-[40px]"
                  title={brand?.name || 'Brand'}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={(brand as any).logo_url}
                    alt={brand?.name || 'Brand'}
                    className="w-full h-full object-contain"
                  />
                </Link>
              )}
          </div>
        </div>

        {description && (
          <p className="!mb-0 text-[13px] sm:text-sm text-[var(--time-gray-500)] leading-[1.3] font-[family-name:var(--font-body)] line-clamp-2">
            {description}
          </p>
        )}

        {packagingParts.length > 0 && (
          <div className="flex gap-2.5 text-[11px] sm:text-xs text-[var(--time-gray-400)] font-mono">
            <span>{packagingParts.join(' · ')}</span>
          </div>
        )}
      </div>

      {/* Price + Actions */}
      <div className="w-[220px] px-5 py-4 flex flex-col justify-center gap-2.5 border-l border-[var(--time-gray-100)] shrink-0">
        {!hidePrices && (
          <div className="flex items-center gap-2 flex-wrap">
            {netPrice != null && Number(netPrice) > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-[22px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-body)] tabular-nums">
                  &euro;{Number(netPrice).toFixed(decimals)}
                </span>
                {hasDiscount && (
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] line-through tabular-nums leading-tight">
                      &euro;{Number(listPrice).toFixed(decimals)}
                    </span>
                    {discountTiers && (
                      <span className="text-xs sm:text-[13px] font-semibold text-[var(--time-gray-600)] leading-tight">
                        {discountTiers}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : hasVariants ? (
              <span className="text-xs text-[var(--time-gray-400)]">
                {variantCount} varianti
              </span>
            ) : (
              <span className="text-sm text-[var(--time-gray-400)]">
                &mdash;
              </span>
            )}
          </div>
        )}

        {hasAvailability && !hasVariants && (
          <div className="flex items-start gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span
                className="w-[7px] h-[7px] rounded-full inline-block"
                style={{ background: isOutOfStock ? '#ef4444' : '#22c55e' }}
              />
              <span
                className="text-xs sm:text-[13px] font-semibold font-[family-name:var(--font-body)]"
                style={{ color: isOutOfStock ? '#dc2626' : '#16a34a' }}
              >
                {availInfo.label}
              </span>
            </div>
            <TimeStatusBadges
              priceData={priceData}
              product={product}
              hasMultiplePromos={hasMultiplePromos}
              onPromoClick={handleClick}
              t={t}
            />
          </div>
        )}

        {isAuthorized && (
          <div className="flex items-center gap-2">
            {hasVariants ? (
              <button
                onClick={handleClick}
                className="flex-1 h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-xs sm:text-[13px] font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:bg-[var(--time-red)]"
              >
                {t('text-view-variants', { defaultValue: 'Vedi varianti' })}
              </button>
            ) : canInlineAdd ? (
              <AddToCart
                lang={lang}
                product={product}
                priceData={cartPriceData}
                showPlaceholder={false}
                className="w-full"
              />
            ) : // Add-to-cart is gated (no price, ADD_TO_CART=false, or
            // promo-gated like a min-value/min-pieces threshold). Mirror the
            // legacy PvQuantityInput layout: keep the cart total visible,
            // and place an external-link / arrow icon next to it that opens
            // the preview/promo modal.
            isPromoGated ? (
              <PromoGatedCta
                cartQty={cartQty}
                onClick={handleClick}
                t={t}
                size="md"
              />
            ) : (
              // Other gating reasons (no price, ADD_TO_CART=false): keep the
              // generic "Visualizza" CTA — same behaviour as before.
              <button
                onClick={handleClick}
                className="flex-1 h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-xs sm:text-[13px] font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:bg-[var(--time-red)]"
              >
                {t('text-view-product', { defaultValue: 'Visualizza' })}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
