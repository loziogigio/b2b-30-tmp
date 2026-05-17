'use client';

import React from 'react';
import Link from '@components/ui/link';
import Image from '@components/ui/image';
import { Product } from '@framework/types';
import { useModalAction } from '@components/common/modal/modal.context';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import { useProductPriceData } from '@framework/pricing';
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
  TimeStatusBadges,
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
}

export default function TimeProductCard({
  product,
  lang,
  priceData,
  className,
}: TimeProductCardProps) {
  const { name, image, sku, brand, parent_sku, model } = product ?? {};
  const { openModal } = useModalAction();
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

  const anyPD = effectivePriceData as any;
  const netPrice =
    anyPD?.price_discount ?? anyPD?.net_price ?? anyPD?.price_gross ?? null;
  const listPrice = anyPD?.price_gross ?? anyPD?.gross_price ?? null;
  const hasDiscount =
    netPrice != null &&
    listPrice != null &&
    Number(listPrice) > Number(netPrice) &&
    Number(netPrice) > 0;
  const discountTiers = effectivePriceData?.discount_description || '';
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(netPrice) / Number(listPrice)) * 100)
    : 0;

  const isOutOfStock = effectivePriceData
    ? Number(effectivePriceData.availability) <= 0
    : false;
  // Same legacy gating as TimeSearchRow: promo-gated items get the PROMO CTA
  // instead of the inline qty selector, with a cart-total readout next to it.
  const { hasMultiplePromos, isPromoGated, canInlineAdd, cartQty } =
    usePromoGating(effectivePriceData, product);

  function handleClick() {
    if (hasVariants) {
      openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', product);
    } else {
      openModal('PRODUCT_VIEW', product);
    }
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
          src={
            image?.thumbnail && image.thumbnail.trim() !== ''
              ? image.thumbnail
              : productPlaceholder
          }
          alt={name || 'Product'}
          fill
          sizes={
            className
              ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
              : '210px'
          }
          className="object-cover"
        />

        {/* Top-left stack: parent code (always) + discount/promo badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {(parent_sku || sku) && (
            <span
              className="bg-[var(--time-dark)]/85 backdrop-blur-[4px] text-white text-[10px] sm:text-[11px] font-semibold px-[7px] py-[3px] rounded-[5px] font-mono tracking-wide max-w-[160px] truncate"
              title={String(parent_sku || sku)}
            >
              {parent_sku || sku}
            </span>
          )}
          {!hidePrices && discountPercent > 0 && (
            <span className="bg-[var(--time-red)] text-white text-[10px] sm:text-[11px] font-bold px-[7px] py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
              {discountTiers || `-${discountPercent}%`}
            </span>
          )}
          {!hidePrices &&
            hasActivePromo(product, effectivePriceData) &&
            discountPercent === 0 && (
              <span className="bg-[var(--time-red)] text-white text-[10px] sm:text-[11px] font-bold px-[7px] py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
                PROMO
              </span>
            )}
        </div>

        {/* Variant count badge */}
        {hasVariants && variantCount > 1 && (
          <span className="absolute top-2 right-2 bg-[var(--time-dark)]/85 backdrop-blur-[4px] text-white text-[10px] sm:text-[11px] font-semibold px-[7px] py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
            {variantCount} var.
          </span>
        )}

        {/* Out of stock label (no blur) */}
        {isOutOfStock && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[2]">
            <span className="bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap">
              {effectivePriceData?.product_label_action?.LABEL ||
                'Non disponibile'}
            </span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="px-3.5 py-3 pb-3.5 flex-1 flex flex-col">
        {/* Brand + SKU + Actions row */}
        <div className="flex items-center justify-between mb-1">
          <div
            className="flex items-baseline gap-1.5 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {sku && (
              <span className="text-[11px] sm:text-xs font-bold text-[var(--time-dark)] font-mono shrink-0">
                {sku}
              </span>
            )}
            {sku && brand?.name && (
              <span className="text-[11px] sm:text-xs text-[var(--time-gray-300)]">
                ·
              </span>
            )}
            {brand?.name && (brand as any)?.brand_id ? (
              <Link
                href={`/${lang}/search?filters-brand_id=${(brand as any).brand_id}`}
                className="text-[11px] sm:text-xs font-bold text-[var(--time-red)] uppercase tracking-wider font-[family-name:var(--font-body)] truncate hover:underline"
              >
                {brand.name}
              </Link>
            ) : brand?.name ? (
              <span className="text-[11px] sm:text-xs font-bold text-[var(--time-red)] uppercase tracking-wider font-[family-name:var(--font-body)] truncate">
                {brand.name}
              </span>
            ) : null}
          </div>
          {isAuthorized && (
            <div className="flex items-center gap-0.5 shrink-0">
              {(isOutOfStock || hasReminder) && (
                <button
                  type="button"
                  aria-label="Toggle reminder"
                  className={`shrink-0 p-0.5 rounded transition-colors ${hasReminder ? 'text-yellow-500' : 'text-[var(--time-gray-400)] hover:text-yellow-500'}`}
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
                    <ReminderIconFilled className="text-[14px] sm:text-[16px]" />
                  ) : (
                    <ReminderIcon className="text-[14px] sm:text-[16px]" />
                  )}
                </button>
              )}
              <button
                type="button"
                aria-label="Toggle wishlist"
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
                  <IoIosHeart className="text-[14px] sm:text-[16px]" />
                ) : (
                  <IoIosHeartEmpty className="text-[14px] sm:text-[16px]" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Product name */}
        <h4 className="text-[13px] sm:text-sm font-bold text-[var(--time-dark)] leading-snug font-[family-name:var(--font-body)] whitespace-nowrap overflow-hidden text-ellipsis mb-1.5">
          {name || 'Product'}
        </h4>

        {/* Model */}
        {model && (
          <div className="mb-2.5 text-[11px] sm:text-xs font-bold text-[var(--time-dark)] truncate font-[family-name:var(--font-body)]">
            {model as string}
          </div>
        )}

        {/* Price */}
        {!hidePrices && (
          <div className="flex items-center gap-1.5">
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
            ) : hasVariants ? (
              <span className="text-xs text-[var(--time-gray-400)] font-[family-name:var(--font-body)]">
                {variantCount} varianti
              </span>
            ) : (
              <span className="text-sm text-[var(--time-gray-400)]">—</span>
            )}
          </div>
        )}

        {/* Availability + status badges */}
        {effectivePriceData && !hasVariants && (
          <div className="flex items-start gap-2 mt-1.5 flex-wrap">
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
                {isOutOfStock
                  ? effectivePriceData?.product_label_action?.LABEL ||
                    t('text-out-stock', { defaultValue: 'Non disponibile' })
                  : t('text-in-stock', { defaultValue: 'Disponibile' })}
              </span>
            </div>
            <TimeStatusBadges
              priceData={effectivePriceData}
              product={product}
              hasMultiplePromos={hasMultiplePromos}
              onPromoClick={handleClick}
              t={t}
              size="sm"
            />
          </div>
        )}

        {/* Add to cart — pinned to the bottom of the card via mt-auto so
            the primary CTA aligns across cards regardless of content. */}
        {isAuthorized && (
          <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
            {hasVariants ? (
              <button
                onClick={handleClick}
                className="w-full h-8 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:bg-[var(--time-red)]"
              >
                {t('text-view-variants', { defaultValue: 'Vedi varianti' })}
              </button>
            ) : canInlineAdd ? (
              <AddToCart
                lang={lang}
                product={product}
                priceData={effectivePriceData}
                showPlaceholder={false}
                className="w-full"
              />
            ) : isPromoGated ? (
              <PromoGatedCta
                cartQty={cartQty}
                onClick={handleClick}
                t={t}
                size="sm"
              />
            ) : (
              // Other gating reasons: keep the original Visualizza CTA.
              <button
                onClick={handleClick}
                className="w-full h-8 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:bg-[var(--time-red)]"
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
