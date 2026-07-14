'use client';

import React from 'react';
import Link from '@components/ui/link';
import Image from '@components/ui/image';
import { Product } from '@framework/types';
import { useProductOpen } from '@/hooks/use-product-open';
import { useCatalogSettings } from '@/hooks/use-catalog-settings';
import { formatTimeAvailability } from './format-time-availability';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import { useProductPriceData } from '@framework/pricing';
import { selectBestPrice } from '@framework/pricing/best-price';
import { buildCartPriceData } from '@components/product/b2b-offer-rows';
import { buildPackagingParts } from '@utils/packaging';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';
import AddToCart from '@components/product/add-to-cart';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import { ReminderIcon, ReminderIconFilled } from '@components/icons/app-icons';
import {
  hasActivePromo,
  PromoGatedCta,
  TimeAlreadyPurchasedBadge,
  TimePromoLabel,
  usePromoGating,
} from './time-promo-gated-cta';
import cn from 'classnames';
import { useHomeSettings } from '@/hooks/use-home-settings';

interface TimeProductCardProps {
  product: Product & { variantCount?: number };
  lang: string;
  priceData?: ErpPriceData;
  className?: string;
  forceShowReminderToggle?: boolean;
  /** Hide the product description (e.g. in the variants preview where every
   *  card repeats the same parent description). */
  hideDescription?: boolean;
}

export default function TimeProductCard({
  product,
  lang,
  priceData,
  className,
  hideDescription = false,
}: TimeProductCardProps) {
  const { name, image, sku, brand, parent_sku, description, model } =
    product ?? {};
  const openProduct = useProductOpen(lang);
  const { isAuthorized, hidePrices } = useUI();
  const { settings } = useHomeSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;
  const { t } = useTranslation(lang, 'common');
  const likes = useLikes();
  const reminders = useReminders();
  const isFavorite = sku ? likes.isLiked(sku) : false;
  const hasReminder = sku ? reminders.hasReminder(sku) : false;
  const [likeLoading, setLikeLoading] = React.useState(false);
  const [reminderLoading, setReminderLoading] = React.useState(false);

  // Route through the unified pricing hook so the active source flag
  // (inline / erp / hybrid) decides whether the slice is synthesized
  // from PIM inline pricing or fetched from ERP. Caller-provided
  // priceData still wins as an explicit override.
  const effectivePriceData = useProductPriceData(product, {
    override: priceData,
  });

  const variations = Array.isArray(product?.variations)
    ? product.variations
    : [];
  const hasVariants =
    (product.variantCount && product.variantCount > 1) || variations.length > 1;

  // Grouped parents often carry no image/name/brand/description of their own —
  // fall back to a representative variant (same as the catalog list row), so
  // multi-variant cards aren't blank "Product" / NO IMAGE placeholders.
  const rep: any =
    (variations as any[]).find(
      (v) => v?.name || v?.image?.thumbnail?.trim() || (v?.brand as any)?.name,
    ) ??
    (variations as any[])[0] ??
    null;
  const displayName = name || rep?.name || parent_sku || '';
  // Code badge: a multi-variant parent is identified by its OWN sku (the group
  // code, e.g. "BK0507"); a single product shows its parent/group code. The
  // SKU row below shows the own sku only when it differs from this badge.
  const badgeCode = (hasVariants ? sku || parent_sku : parent_sku || sku) || '';
  const displayDescription = description || rep?.description || '';
  const displayBrand: any =
    (brand as any)?.brand_id || (brand as any)?.name
      ? brand
      : (rep?.brand ?? brand);
  // Only show the brand when an actual brand value is present.
  const hasBrand = (displayBrand?.name ?? '').trim().length > 0;
  const headerImg =
    (image?.thumbnail?.trim() ? image.thumbnail : rep?.image?.thumbnail) ||
    productPlaceholder;

  const anyPD = effectivePriceData as any;
  // Lowest of the listino and any qualifying promo — not the ERP's single
  // pre-selected improving_promo, which can be dearer than both.
  const best = selectBestPrice(effectivePriceData);
  const netPrice = effectivePriceData ? best.effectivePrice : null;
  // The cart must book the price the card shows: substitute the winning promo
  // (or strip the ERP's flattened promo identity when the listino wins).
  const cartPriceData = effectivePriceData
    ? buildCartPriceData(effectivePriceData)
    : undefined;
  const listPrice = anyPD?.price_gross ?? anyPD?.gross_price ?? null;
  const hasDiscount =
    netPrice != null &&
    listPrice != null &&
    Number(listPrice) > Number(netPrice) &&
    Number(netPrice) > 0;
  const discountTiers = effectivePriceData?.discount_description || '';
  // Packaging tags (UM / CF / MV) — same source as the catalog row.
  const packagingParts = effectivePriceData
    ? buildPackagingParts(effectivePriceData)
    : [];
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(netPrice) / Number(listPrice)) * 100)
    : 0;

  const { settings: catalogSettings } = useCatalogSettings();
  const availInfo = formatTimeAvailability(
    effectivePriceData,
    catalogSettings.availabilityDisplay,
    t,
  );
  const availability = Number(effectivePriceData?.availability);
  const hasAvailability =
    isAuthorized &&
    effectivePriceData?.availability != null &&
    Number.isFinite(availability);
  const isOutOfStock = hasAvailability && availability <= 0;
  // Same legacy gating as TimeSearchRow: promo-gated items get the PROMO CTA
  // instead of the inline qty selector, with a cart-total readout next to it.
  const { hasMultiplePromos, isPromoGated, canInlineAdd, cartQty } =
    usePromoGating(effectivePriceData, product);

  function handleClick() {
    openProduct(product, !!hasVariants);
  }

  const variantCount = product.variantCount ?? variations.length;

  return (
    <article
      onClick={handleClick}
      className={cn(
        'bg-white rounded-xl border border-[var(--time-gray-100)] overflow-hidden cursor-pointer transition-all duration-[250ms] hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] hover:-translate-y-[3px]',
        className ?? 'min-w-[210px] max-w-[210px] shrink-0',
      )}
      style={className ? undefined : { scrollSnapAlign: 'start' }}
    >
      {/* Image area */}
      <div className="aspect-square relative bg-gradient-to-br from-[var(--time-gray-50)] to-[var(--time-gray-100)]">
        <Image
          src={headerImg}
          alt={displayName || 'Product'}
          fill
          sizes={
            className
              ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
              : '210px'
          }
          // contain (not cover) so non-square product shots are shown whole
          // instead of being cropped into an unrecognizable detail; the gradient
          // backdrop fills the letterbox.
          className="object-contain"
        />

        {/* Top-left stack: parent code (always) + discount/promo badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {badgeCode && (
            <span
              className="bg-[var(--time-dark)] text-white text-[10px] sm:text-[11px] font-bold px-2 py-[3px] rounded-[5px] font-mono tracking-wide max-w-[160px] truncate"
              title={String(badgeCode)}
            >
              {badgeCode}
            </span>
          )}
          {/* Discount % badge over the image: single products, and only when
              the card is actually on promo (a plain price discount doesn't
              earn the badge). */}
          {!hidePrices &&
            !hasVariants &&
            discountPercent > 0 &&
            hasActivePromo(product, effectivePriceData) && (
              <span className="bg-[var(--time-red)] text-white text-[10px] sm:text-[11px] font-bold px-[7px] py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
                {discountTiers || `-${discountPercent}%`}
              </span>
            )}
          {/* PROMO: a multi-variant parent shows it whenever ANY child carries
              the promo flag (hasActivePromo checks the variations). */}
          {!hidePrices &&
            hasActivePromo(product, effectivePriceData) &&
            (hasVariants || discountPercent === 0) && (
              <span className="bg-[var(--time-red)] text-white text-[10px] sm:text-[11px] font-bold px-[7px] py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
                PROMO
              </span>
            )}
        </div>
      </div>

      {/* Info section */}
      <div className="px-3.5 py-2.5 pb-3 flex-1 flex flex-col">
        {/* Brand + SKU + Actions row */}
        <div className="flex items-center justify-between mb-1">
          <div
            className="flex items-baseline gap-1.5 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {sku && (hasVariants || sku !== parent_sku) && (
              <span className="text-[11px] sm:text-xs font-bold text-[var(--time-dark)] font-mono shrink-0">
                {sku}
              </span>
            )}
            {sku && (hasVariants || sku !== parent_sku) && hasBrand && (
              <span className="text-[11px] sm:text-xs text-[var(--time-gray-300)]">
                ·
              </span>
            )}
            {hasBrand && (displayBrand as any)?.brand_id ? (
              <Link
                href={`/${lang}/search?filters-brand_id=${(displayBrand as any).brand_id}`}
                className="text-[11px] sm:text-xs font-bold text-[var(--time-red)] uppercase tracking-wider font-[family-name:var(--font-body)] truncate hover:underline"
              >
                {displayBrand.name}
              </Link>
            ) : hasBrand ? (
              <span className="text-[11px] sm:text-xs font-bold text-[var(--time-red)] uppercase tracking-wider font-[family-name:var(--font-body)] truncate">
                {displayBrand.name}
              </span>
            ) : null}
          </div>
        </div>

        {/* Product name */}
        <h4 className="text-[13px] sm:text-sm font-bold text-[var(--time-dark)] leading-snug font-[family-name:var(--font-body)] whitespace-nowrap overflow-hidden text-ellipsis mb-1.5">
          {displayName || 'Product'}
        </h4>

        {/* Description — 2 lines */}
        {!hideDescription && displayDescription && (
          <p className="!mb-1.5 text-[11px] sm:text-xs text-[var(--time-gray-500)] leading-[1.3] font-[family-name:var(--font-body)] line-clamp-2">
            {displayDescription}
          </p>
        )}

        {/* Model */}
        {model && (
          <div className="mb-1.5 text-[11px] sm:text-xs font-bold text-[var(--time-dark)] truncate font-[family-name:var(--font-body)]">
            {model as string}
          </div>
        )}

        {/* Packaging — UM / CF / MV (compact, single-space separator) */}
        {packagingParts.length > 0 && (
          <div className="mb-2 text-[11px] sm:text-xs text-[var(--time-gray-400)] tracking-tight">
            {packagingParts.join(' · ')}
          </div>
        )}

        {/* Price */}
        {!hidePrices && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0">
            {netPrice != null && Number(netPrice) > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-body)] tabular-nums">
                  €{Number(netPrice).toFixed(decimals)}
                </span>
                {hasDiscount && (
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] line-through tabular-nums leading-tight">
                      €{Number(listPrice).toFixed(decimals)}
                    </span>
                    {discountTiers && (
                      <span className="text-[11px] sm:text-xs font-semibold text-[var(--time-gray-600)] leading-tight">
                        {discountTiers}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : hasVariants ? null : (
              <span className="text-sm text-[var(--time-gray-400)]">—</span>
            )}
          </div>
        )}

        {/* Bottom group: CTA pinned via mt-auto, availability centered below it. */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
          {hasVariants ? (
            /* Variant parent: a single "Vedi N varianti" button. Not auth-gated —
               anonymous users must still be able to open the variants view. */
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleClick}
                className="w-full h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:bg-[var(--time-red)]"
              >
                {t('text-view-n-variants', {
                  n: variantCount,
                  defaultValue: 'Vedi {{n}} varianti',
                })}
              </button>
            </div>
          ) : (
            /* Single product: add-to-cart / promo / visualizza CTA. */
            isAuthorized && (
              <div
                className="flex justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {canInlineAdd ? (
                  <AddToCart
                    lang={lang}
                    product={product}
                    priceData={cartPriceData}
                    showPlaceholder={false}
                    className="time-stepper time-stepper-color"
                  />
                ) : isPromoGated ? (
                  <PromoGatedCta
                    cartQty={cartQty}
                    onClick={handleClick}
                    t={t}
                    size="sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleClick}
                    className="w-full h-8 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:bg-[var(--time-red)]"
                  >
                    {t('text-view-product', { defaultValue: 'Visualizza' })}
                  </button>
                )}
              </div>
            )
          )}

          {/* Full-width separator between the quantity selector and the
              availability + actions block. */}
          {hasAvailability && !hasVariants && (
            <div className="border-t border-[var(--time-gray-100)] pt-2.5 flex flex-col gap-2">
              {/* Availability + promo label — centered */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-[6px] h-[6px] rounded-full inline-block"
                    style={{
                      background: isOutOfStock
                        ? 'var(--time-red, #dc2626)'
                        : 'var(--time-success, #16a34a)',
                    }}
                  />
                  <span
                    className="text-[11px] sm:text-xs font-semibold font-[family-name:var(--font-body)]"
                    style={{
                      color: isOutOfStock
                        ? 'var(--time-red, #dc2626)'
                        : 'var(--time-success, #16a34a)',
                    }}
                  >
                    {availInfo.label}
                  </span>
                </div>
                {hasActivePromo(product, effectivePriceData) && (
                  <TimePromoLabel
                    hasMultiplePromos={hasMultiplePromos}
                    onClick={handleClick}
                    t={t}
                    size="sm"
                  />
                )}
              </div>

              {/* Like · reminder (not clickable when in stock) · last purchase —
                  one line below the availability. */}
              {isAuthorized && (
                <div
                  className="flex items-center justify-center gap-3 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Toggle wishlist"
                    title={t(
                      isFavorite
                        ? 'text-remove-from-wishlist'
                        : 'text-add-to-wishlist',
                      {
                        defaultValue: isFavorite
                          ? 'Rimuovi dai preferiti'
                          : 'Aggiungi ai preferiti',
                      },
                    )}
                    className={`shrink-0 p-0.5 rounded transition-colors ${isFavorite ? 'text-[var(--time-red)]' : 'text-[var(--time-gray-400)] hover:text-[var(--time-red)]'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!sku) return;
                      setLikeLoading(true);
                      likes.toggle(sku).finally(() => setLikeLoading(false));
                    }}
                    disabled={likeLoading || !sku}
                  >
                    {isFavorite ? (
                      <IoIosHeart className="text-[16px]" />
                    ) : (
                      <IoIosHeartEmpty className="text-[16px]" />
                    )}
                  </button>
                  {/* Reminder ("notify when back in stock") only makes sense for
                      unavailable items — hide it entirely when in stock. */}
                  {isOutOfStock && (
                    <button
                      type="button"
                      aria-label="Toggle reminder"
                      title={t(
                        hasReminder
                          ? 'text-remove-reminder'
                          : 'text-notify-when-available',
                        {
                          defaultValue: hasReminder
                            ? 'Rimuovi avviso di disponibilità'
                            : 'Avvisami quando disponibile',
                        },
                      )}
                      className={`shrink-0 p-0.5 rounded transition-colors ${hasReminder ? 'text-yellow-500' : 'text-[var(--time-gray-400)] hover:text-yellow-500'} disabled:opacity-40 disabled:cursor-default`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!sku) return;
                        setReminderLoading(true);
                        reminders
                          .toggle(sku)
                          .finally(() => setReminderLoading(false));
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
                  {effectivePriceData?.buy_did && (
                    <TimeAlreadyPurchasedBadge
                      priceData={effectivePriceData}
                      t={t}
                      size="sm"
                      inline
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
