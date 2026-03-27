'use client';

import Image from '@components/ui/image';
import { Product } from '@framework/types';
import { useModalAction } from '@components/common/modal/modal.context';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import cn from 'classnames';

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
  const { name, image, sku, brand, parent_sku } = product ?? {};
  const { openModal } = useModalAction();

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

        {/* Discount badge */}
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 bg-[var(--time-red)] text-white text-[10px] font-bold px-[7px] py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
            -{discountPercent}%
          </span>
        )}

        {/* Promo badge */}
        {(priceData?.is_promo || product.has_active_promo) &&
          discountPercent === 0 && (
            <span className="absolute top-2 left-2 bg-[var(--time-red)] text-white text-[10px] font-bold px-[7px] py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
              PROMO
            </span>
          )}

        {/* Variant count badge */}
        {hasVariants && variantCount > 1 && (
          <span className="absolute top-2 right-2 bg-[var(--time-dark)]/85 backdrop-blur-[4px] text-white text-[9px] font-semibold px-[7px] py-[3px] rounded-[5px] font-[family-name:var(--font-body)]">
            {variantCount} var.
          </span>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-[var(--time-dark)] text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
              Non disponibile
            </span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="px-3.5 py-3 pb-3.5">
        {/* Brand + SKU row */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-[var(--time-red)] uppercase tracking-wider font-[family-name:var(--font-body)] truncate max-w-[60%]">
            {brand?.name || ''}
          </span>
          <span className="text-[9px] text-[var(--time-gray-400)] font-mono">
            {sku || parent_sku || ''}
          </span>
        </div>

        {/* Product name */}
        <h4 className="text-[13px] font-bold text-[var(--time-dark)] leading-snug font-[family-name:var(--font-body)] whitespace-nowrap overflow-hidden text-ellipsis mb-2.5">
          {name || 'Product'}
        </h4>

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          {netPrice != null && Number(netPrice) > 0 ? (
            <>
              <span className="text-lg font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-body)] tabular-nums">
                €{Number(netPrice).toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-[var(--time-gray-400)] line-through tabular-nums">
                  €{Number(listPrice).toFixed(2)}
                </span>
              )}
            </>
          ) : hasVariants ? (
            <span className="text-xs text-[var(--time-gray-400)] font-[family-name:var(--font-body)]">
              {variantCount} varianti
            </span>
          ) : (
            <span className="text-sm text-[var(--time-gray-400)]">—</span>
          )}
        </div>
      </div>
    </article>
  );
}
