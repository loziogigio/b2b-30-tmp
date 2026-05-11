'use client';

import Link from '@components/ui/link';
import Image from '@components/ui/image';
import { Product } from '@framework/types';
import { useModalAction } from '@components/common/modal/modal.context';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import AddToCart from '@components/product/add-to-cart';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
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

interface TimeSearchCardProps {
  product: Product & { variantCount?: number };
  lang: string;
  priceData?: ErpPriceData;
  index?: number;
}

export default function TimeSearchCard({
  product,
  lang,
  priceData,
  index = 0,
}: TimeSearchCardProps) {
  const { name, image, sku, brand, parent_sku, description, model, unit } =
    product ?? {};
  const { openModal } = useModalAction();
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
  const netPrice =
    anyPD?.price_discount ?? anyPD?.net_price ?? anyPD?.price_gross ?? null;
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

  const isOutOfStock = priceData ? Number(priceData.availability) <= 0 : false;
  const variantCount = product.variantCount ?? variations.length;
  // Same legacy gating as TimeSearchRow / TimeProductCard.
  const { hasMultiplePromos, isPromoGated, canInlineAdd, cartQty } =
    usePromoGating(priceData, product);

  // Packaging info from ERP
  const um = priceData?.packaging_option_default?.packaging_uom || unit || null;
  const mv = priceData?.packaging_option_smallest?.qty_x_packaging ?? null;
  const cf = priceData?.packaging_option_default?.qty_x_packaging ?? null;

  function handleClick() {
    if (hasVariants) {
      openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', product);
    } else {
      openModal('PRODUCT_VIEW', product);
    }
  }

  return (
    <article
      className="relative bg-white rounded-[var(--radius-card)] border border-[var(--time-gray-100)] overflow-hidden flex flex-col transition-all duration-[250ms] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-[2px]"
      style={{
        animation: `time-fadeUp 0.4s ease ${index * 0.05}s both`,
      }}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-[2] flex gap-1.5 flex-wrap">
        {parent_sku && (
          <span className="bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold px-2 py-[3px] rounded-[5px] font-mono tracking-wide">
            {parent_sku}
          </span>
        )}
        {!hidePrices && discountPercent > 0 && (
          <span className="bg-[var(--time-red)] text-white text-[11px] sm:text-xs font-bold px-2 py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
            {discountTiers || `-${discountPercent}%`}
          </span>
        )}
        {!hidePrices &&
          hasActivePromo(product, priceData) &&
          discountPercent === 0 && (
            <span className="bg-[var(--time-red)] text-white text-[11px] sm:text-xs font-bold px-2 py-[3px] rounded-[5px] font-[family-name:var(--font-body)] uppercase">
              PROMO
            </span>
          )}
      </div>
      {hasVariants && variantCount > 1 && (
        <span className="absolute top-3 right-3 z-[2] bg-[var(--time-dark)]/85 backdrop-blur-[4px] text-white text-[11px] sm:text-xs font-semibold px-2 py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
          {variantCount} varianti
        </span>
      )}

      {/* Image area */}
      <div
        className="relative aspect-square bg-gradient-to-br from-[var(--time-gray-50)] to-[var(--time-gray-100)] cursor-pointer"
        onClick={handleClick}
      >
        <Image
          src={
            image?.thumbnail && image.thumbnail.trim() !== ''
              ? image.thumbnail
              : productPlaceholder
          }
          alt={name || 'Product'}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
        />
        {/* Out of stock label */}
        {isOutOfStock && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[2]">
            <span className="bg-[var(--time-dark)] text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-md">
              {priceData?.product_label_action?.LABEL || 'Non disponibile'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-1 flex-1 flex flex-col gap-1">
        {/* Brand + SKU + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            {brand?.name && (brand as any)?.brand_id ? (
              <Link
                href={`/${lang}/search?filters-brand_id=${(brand as any).brand_id}`}
                className="text-xs sm:text-[13px] font-bold text-[var(--time-red)] font-[family-name:var(--font-body)] uppercase tracking-[0.06em] truncate hover:underline"
              >
                {brand.name}
              </Link>
            ) : (
              <span className="text-xs sm:text-[13px] font-bold text-[var(--time-red)] font-[family-name:var(--font-body)] uppercase tracking-[0.06em] truncate">
                {brand?.name || ''}
              </span>
            )}
            <span className="text-[11px] sm:text-xs text-[var(--time-gray-400)] font-mono shrink-0">
              SKU {sku || parent_sku || ''}
            </span>
          </div>
          {isAuthorized && (
            <div className="flex items-center gap-0.5 shrink-0">
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
        </div>

        {/* Product name — fixed 1 line */}
        <h3
          className="text-sm sm:text-[15px] font-bold text-[var(--time-dark)] leading-[1.35] font-[family-name:var(--font-body)] line-clamp-1 cursor-pointer"
          onClick={handleClick}
        >
          {name || 'Product'}
        </h3>

        {/* Description — fixed 2 lines */}
        <p className="!mb-0 text-xs sm:text-[13px] text-[var(--time-gray-500)] leading-[1.3] font-[family-name:var(--font-body)] line-clamp-2 min-h-[calc(2*12px*1.3)]">
          {description || '\u00A0'}
        </p>

        {/* Model — fixed 1 line */}
        <p className="!mb-0 text-xs sm:text-[13px] font-bold text-[var(--time-dark)] font-[family-name:var(--font-body)] truncate min-h-[calc(12px*1.5)]">
          {model || '\u00A0'}
        </p>

        {/* Unit info */}
        {priceData && um && (
          <div className="flex gap-2 text-[11px] sm:text-xs text-[var(--time-gray-400)] font-mono mt-0.5">
            {um && <span>UM: {um}</span>}
            {mv != null && (
              <>
                <span>·</span>
                <span>MV: {mv}</span>
              </>
            )}
            {cf != null && (
              <>
                <span>·</span>
                <span>CF: {cf}</span>
              </>
            )}
          </div>
        )}

        {/* Price + Availability + CTA */}
        <div className="border-t border-[var(--time-gray-100)] pt-2 mt-auto flex flex-col gap-2">
          {/* Price */}
          {!hidePrices && (
            <div className="flex items-baseline gap-2">
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
                <span className="text-xs text-[var(--time-gray-400)] font-[family-name:var(--font-body)]">
                  {variantCount} varianti
                </span>
              ) : (
                <span className="text-sm text-[var(--time-gray-400)]">
                  &mdash;
                </span>
              )}
            </div>
          )}

          {/* Availability + status badges */}
          {priceData && !hasVariants && (
            <div className="flex items-start gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-[7px] h-[7px] rounded-full inline-block"
                  style={{
                    background: isOutOfStock ? '#ef4444' : '#22c55e',
                  }}
                />
                <span
                  className="text-xs sm:text-[13px] font-semibold font-[family-name:var(--font-body)]"
                  style={{
                    color: isOutOfStock ? '#dc2626' : '#16a34a',
                  }}
                >
                  {isOutOfStock
                    ? priceData?.product_label_action?.LABEL ||
                      t('text-out-stock', {
                        defaultValue: 'Non disponibile',
                      })
                    : t('text-in-stock', { defaultValue: 'Disponibile' })}
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

          {/* CTA */}
          {isAuthorized && (
            <div className="flex items-stretch gap-1.5 w-full">
              {hasVariants ? (
                <button
                  onClick={handleClick}
                  className="w-full h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-xs sm:text-[13px] font-bold cursor-pointer font-[family-name:var(--font-body)] tracking-[0.03em] transition-colors hover:bg-[var(--time-red)]"
                >
                  {t('text-view-variants', {
                    defaultValue: 'Vedi varianti',
                  })}
                </button>
              ) : canInlineAdd ? (
                <AddToCart
                  lang={lang}
                  product={product}
                  priceData={priceData}
                  showPlaceholder={false}
                  className="w-full"
                />
              ) : isPromoGated ? (
                <PromoGatedCta
                  cartQty={cartQty}
                  onClick={handleClick}
                  t={t}
                  size="md"
                />
              ) : (
                // Other gating reasons: keep the original Visualizza CTA.
                <button
                  onClick={handleClick}
                  className="w-full h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-xs sm:text-[13px] font-bold cursor-pointer font-[family-name:var(--font-body)] tracking-[0.03em] transition-colors hover:bg-[var(--time-red)]"
                >
                  {t('text-view-product', {
                    defaultValue: 'Visualizza prodotto',
                  })}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
