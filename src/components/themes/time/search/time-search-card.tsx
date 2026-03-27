'use client';

import Image from '@components/ui/image';
import { Product } from '@framework/types';
import { useModalAction } from '@components/common/modal/modal.context';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import AddToCart from '@components/product/add-to-cart';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';

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
  const { isAuthorized } = useUI();

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
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(netPrice) / Number(listPrice)) * 100)
    : 0;

  const isOutOfStock = priceData ? Number(priceData.availability) <= 0 : false;
  const canAddToCart = priceData?.product_label_action?.ADD_TO_CART ?? true;
  const hasValidPrice = priceData && netPrice != null && Number(netPrice) > 0;
  const variantCount = product.variantCount ?? variations.length;

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
          <span className="bg-[var(--time-dark)] text-white text-[10px] font-bold px-2 py-[3px] rounded-[5px] font-mono tracking-wide">
            {parent_sku}
          </span>
        )}
        {discountPercent > 0 && (
          <span className="bg-[var(--time-red)] text-white text-[10px] font-bold px-2 py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
            -{discountPercent}%
          </span>
        )}
        {(priceData?.is_promo || product.has_active_promo) &&
          discountPercent === 0 && (
            <span className="bg-[var(--time-red)] text-white text-[10px] font-bold px-2 py-[3px] rounded-[5px] font-[family-name:var(--font-body)] uppercase">
              PROMO
            </span>
          )}
      </div>
      {hasVariants && variantCount > 1 && (
        <span className="absolute top-3 right-3 z-[2] bg-[var(--time-dark)]/85 backdrop-blur-[4px] text-white text-[10px] font-semibold px-2 py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
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
        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-[var(--time-dark)] text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
              {priceData?.product_label_action?.LABEL || 'Non disponibile'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-3 flex-1 flex flex-col gap-2">
        {/* Brand + SKU */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--time-red)] font-[family-name:var(--font-body)] uppercase tracking-[0.06em] truncate max-w-[60%]">
            {brand?.name || ''}
          </span>
          <span className="text-[10px] text-[var(--time-gray-400)] font-mono">
            SKU {sku || parent_sku || ''}
          </span>
        </div>

        {/* Product name */}
        <h3
          className="text-[14px] font-bold text-[var(--time-dark)] leading-[1.35] font-[family-name:var(--font-body)] line-clamp-2 cursor-pointer"
          onClick={handleClick}
        >
          {name || 'Product'}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-[12px] text-[var(--time-gray-500)] leading-[1.5] font-[family-name:var(--font-body)] line-clamp-2">
            {description}
          </p>
        )}

        {/* Unit info */}
        {priceData && (um || model) && (
          <div className="flex gap-2 text-[10px] text-[var(--time-gray-400)] font-mono mt-0.5">
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
            {model && (
              <>
                <span>·</span>
                <span>{model}</span>
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Price + Availability + CTA */}
        <div className="border-t border-[var(--time-gray-100)] pt-3 mt-2 flex flex-col gap-2.5">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            {netPrice != null && Number(netPrice) > 0 ? (
              <>
                <span className="text-[22px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-body)] tabular-nums">
                  &euro;{Number(netPrice).toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-[13px] text-[var(--time-gray-400)] line-through tabular-nums">
                    &euro;{Number(listPrice).toFixed(2)}
                  </span>
                )}
              </>
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

          {/* Availability */}
          {priceData && !hasVariants && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-[7px] h-[7px] rounded-full inline-block"
                style={{
                  background: isOutOfStock ? '#ef4444' : '#22c55e',
                }}
              />
              <span
                className="text-[11px] font-semibold font-[family-name:var(--font-body)]"
                style={{
                  color: isOutOfStock ? '#dc2626' : '#16a34a',
                }}
              >
                {isOutOfStock
                  ? priceData?.product_label_action?.LABEL ||
                    t('text-out-stock', { defaultValue: 'Non disponibile' })
                  : t('text-in-stock', { defaultValue: 'Disponibile' })}
              </span>
            </div>
          )}

          {/* CTA */}
          {isAuthorized && (
            <div className="flex items-center gap-2">
              {hasVariants ? (
                <button
                  onClick={handleClick}
                  className="w-full h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-[12px] font-bold cursor-pointer font-[family-name:var(--font-body)] tracking-[0.03em] transition-colors hover:bg-[var(--time-red)]"
                >
                  {t('text-view-variants', {
                    defaultValue: 'Vedi varianti',
                  })}
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
                  className="w-full h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-[12px] font-bold cursor-pointer font-[family-name:var(--font-body)] tracking-[0.03em] transition-colors hover:bg-[var(--time-red)]"
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
