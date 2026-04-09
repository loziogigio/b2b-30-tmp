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
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import { ReminderIcon, ReminderIconFilled } from '@components/icons/app-icons';
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
  priceData,
  index = 0,
}: TimeSearchRowProps) {
  const { name, image, sku, brand, parent_sku, description, model, unit } =
    product ?? {};
  const { openModal } = useModalAction();
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized, hidePrices } = useUI();
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
  const canAddToCart = priceData?.product_label_action?.ADD_TO_CART ?? true;
  const hasValidPrice = priceData && netPrice != null && Number(netPrice) > 0;
  const variantCount = product.variantCount ?? variations.length;
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
      className="bg-white rounded-[var(--radius-card)] border border-[var(--time-gray-100)] overflow-hidden flex items-stretch transition-shadow duration-[250ms] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      style={{
        animation: `time-fadeUp 0.35s ease ${index * 0.04}s both`,
      }}
    >
      {/* Image */}
      <div
        className="w-[140px] aspect-square bg-gradient-to-br from-[var(--time-gray-50)] to-[var(--time-gray-100)] shrink-0 relative cursor-pointer"
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
          sizes="140px"
          className="object-cover"
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
            (priceData?.is_promo || product.has_active_promo) &&
            discountPercent === 0 && (
              <span className="bg-[var(--time-red)] text-white text-[10px] sm:text-[11px] font-bold px-1.5 py-[2px] rounded font-[family-name:var(--font-body)]">
                PROMO
              </span>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {brand?.name && (brand as any)?.brand_id ? (
              <Link
                href={`/${lang}/search?filters-brand_id=${(brand as any).brand_id}`}
                className="text-xs sm:text-[13px] font-bold text-[var(--time-red)] font-[family-name:var(--font-body)] uppercase tracking-[0.06em] hover:underline"
              >
                {brand.name}
              </Link>
            ) : (
              <span className="text-xs sm:text-[13px] font-bold text-[var(--time-red)] font-[family-name:var(--font-body)] uppercase tracking-[0.06em]">
                {brand?.name || ''}
              </span>
            )}
            <span className="text-[11px] sm:text-xs text-[var(--time-gray-400)] font-mono">
              SKU {sku || parent_sku || ''}
            </span>
            {hasVariants && variantCount > 1 && (
              <span className="bg-[var(--time-gray-100)] text-[var(--time-gray-600)] text-[11px] sm:text-xs font-semibold px-2 py-[2px] rounded font-[family-name:var(--font-body)]">
                {variantCount} varianti
              </span>
            )}
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
                    try { await reminders.toggle(sku); } finally { setReminderLoading(false); }
                  }}
                  disabled={reminderLoading || !sku}
                >
                  {hasReminder ? <ReminderIconFilled className="text-[16px]" /> : <ReminderIcon className="text-[16px]" />}
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
                  try { await likes.toggle(sku); } finally { setLikeLoading(false); }
                }}
                disabled={likeLoading || !sku}
              >
                {isFavorite ? <IoIosHeart className="text-[16px]" /> : <IoIosHeartEmpty className="text-[16px]" />}
              </button>
            </div>
          )}
        </div>

        <h3
          className="text-[15px] sm:text-base font-bold text-[var(--time-dark)] leading-[1.3] font-[family-name:var(--font-body)] cursor-pointer"
          onClick={handleClick}
        >
          {name || 'Product'}
        </h3>

        {description && (
          <p className="!mb-0 text-[13px] sm:text-sm text-[var(--time-gray-500)] leading-[1.3] font-[family-name:var(--font-body)] line-clamp-2">
            {description}
          </p>
        )}

        {/* Model — own bold line */}
        {model && (
          <p className="!mb-0 text-xs sm:text-[13px] font-bold text-[var(--time-dark)] font-[family-name:var(--font-body)] truncate">
            {model}
          </p>
        )}

        {um && (
          <div className="flex gap-2.5 text-[11px] sm:text-xs text-[var(--time-gray-400)] font-mono">
            <span>UM: {um}</span>
            {mv != null && <span>MV: {mv}</span>}
            {cf != null && <span>CF: {cf}</span>}
          </div>
        )}
      </div>

      {/* Price + Actions */}
      <div className="w-[220px] px-5 py-4 flex flex-col justify-center gap-2.5 border-l border-[var(--time-gray-100)] shrink-0">
        {!hidePrices && (
          <div className="flex items-center gap-2">
            {netPrice != null && Number(netPrice) > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-[22px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-body)] tabular-nums">
                  &euro;{Number(netPrice).toFixed(2)}
                </span>
                {hasDiscount && (
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-[13px] text-[var(--time-gray-400)] line-through tabular-nums leading-tight">
                      &euro;{Number(listPrice).toFixed(2)}
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
              <span className="text-sm text-[var(--time-gray-400)]">&mdash;</span>
            )}
          </div>
        )}

        {priceData && !hasVariants && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-[7px] h-[7px] rounded-full inline-block"
              style={{ background: isOutOfStock ? '#ef4444' : '#22c55e' }}
            />
            <span
              className="text-xs sm:text-[13px] font-semibold font-[family-name:var(--font-body)]"
              style={{ color: isOutOfStock ? '#dc2626' : '#16a34a' }}
            >
              {isOutOfStock
                ? priceData?.product_label_action?.LABEL || 'Non disponibile'
                : 'Disponibile'}
            </span>
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
            ) : hasValidPrice && canAddToCart ? (
              <AddToCart
                lang={lang}
                product={product}
                priceData={priceData}
                showPlaceholder={false}
                className="w-full"
              />
            ) : (
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
