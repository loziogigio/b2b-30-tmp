'use client';

import Image from '@components/ui/image';
import { Product } from '@framework/types';
import { useModalAction } from '@components/common/modal/modal.context';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import AddToCart from '@components/product/add-to-cart';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';

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
            <span className="bg-[var(--time-dark)] text-white text-[9px] font-bold px-1.5 py-[2px] rounded font-mono">
              {parent_sku}
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-[var(--time-red)] text-white text-[9px] font-bold px-1.5 py-[2px] rounded font-[family-name:var(--font-body)]">
              -{discountPercent}%
            </span>
          )}
          {(priceData?.is_promo || product.has_active_promo) &&
            discountPercent === 0 && (
              <span className="bg-[var(--time-red)] text-white text-[9px] font-bold px-1.5 py-[2px] rounded font-[family-name:var(--font-body)]">
                PROMO
              </span>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-[var(--time-red)] font-[family-name:var(--font-body)] uppercase tracking-[0.06em]">
            {brand?.name || ''}
          </span>
          <span className="text-[10px] text-[var(--time-gray-400)] font-mono">
            SKU {sku || parent_sku || ''}
          </span>
          {hasVariants && variantCount > 1 && (
            <span className="bg-[var(--time-gray-100)] text-[var(--time-gray-600)] text-[10px] font-semibold px-2 py-[2px] rounded font-[family-name:var(--font-body)]">
              {variantCount} varianti
            </span>
          )}
        </div>

        <h3
          className="text-[15px] font-bold text-[var(--time-dark)] leading-[1.3] font-[family-name:var(--font-body)] cursor-pointer"
          onClick={handleClick}
        >
          {name || 'Product'}
        </h3>

        {description && (
          <p className="text-[13px] text-[var(--time-gray-500)] leading-[1.5] font-[family-name:var(--font-body)] line-clamp-2">
            {description}
          </p>
        )}

        {(um || model) && (
          <div className="flex gap-2.5 text-[10px] text-[var(--time-gray-400)] font-mono">
            {um && <span>UM: {um}</span>}
            {mv != null && <span>MV: {mv}</span>}
            {cf != null && <span>CF: {cf}</span>}
            {model && <span>{model}</span>}
          </div>
        )}
      </div>

      {/* Price + Actions */}
      <div className="w-[220px] px-5 py-4 flex flex-col justify-center gap-2.5 border-l border-[var(--time-gray-100)] shrink-0">
        <div className="flex items-baseline gap-2">
          {netPrice != null && Number(netPrice) > 0 ? (
            <>
              <span className="text-[22px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-body)] tabular-nums">
                &euro;{Number(netPrice).toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-[12px] text-[var(--time-gray-400)] line-through tabular-nums">
                  &euro;{Number(listPrice).toFixed(2)}
                </span>
              )}
            </>
          ) : hasVariants ? (
            <span className="text-xs text-[var(--time-gray-400)]">
              {variantCount} varianti
            </span>
          ) : (
            <span className="text-sm text-[var(--time-gray-400)]">&mdash;</span>
          )}
        </div>

        {priceData && !hasVariants && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-[7px] h-[7px] rounded-full inline-block"
              style={{ background: isOutOfStock ? '#ef4444' : '#22c55e' }}
            />
            <span
              className="text-[11px] font-semibold font-[family-name:var(--font-body)]"
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
                className="flex-1 h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-[12px] font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:bg-[var(--time-red)]"
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
                className="flex-1 h-9 rounded-[var(--radius-btn)] border-none bg-[var(--time-dark)] text-white text-[12px] font-bold cursor-pointer font-[family-name:var(--font-body)] transition-colors hover:bg-[var(--time-red)]"
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
