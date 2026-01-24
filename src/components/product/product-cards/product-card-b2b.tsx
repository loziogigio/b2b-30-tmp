import cn from 'classnames';
import * as React from 'react';
import Image from '@components/ui/image';
import { Product } from '@framework/types';
import { useModalAction } from '@components/common/modal/modal.context';
import { productPlaceholder } from '@assets/placeholders';
import { useTranslation } from 'src/app/i18n/client';
import Link from 'next/link';
import { ErpPriceData } from '@utils/transform/erp-prices';
import { formatAvailability } from '@utils/format-availability';
import PriceAndPromo from '../price-and-promo';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import { IoNotificationsOutline, IoNotifications } from 'react-icons/io5';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useUI } from '@contexts/ui.context';
import {
  useHomeSettings,
  getCardStyleCSS,
  getCardHoverClass,
} from '@/hooks/use-home-settings';
import AddToCart from '../add-to-cart';
import { Eye } from '@components/icons/eye-icon';
import useWindowSize from '@utils/use-window-size';

interface RenderPopupOrAddToCartProps {
  props: { data: Product & { variantCount?: number } };
  lang: string;
  priceData?: ErpPriceData;
}

function RenderPopupOrAddToCart({
  props,
  lang,
  priceData,
}: RenderPopupOrAddToCartProps) {
  const { data } = props;
  const { t } = useTranslation(lang, 'common');
  const { width } = useWindowSize();
  const { openModal } = useModalAction();
  const iconSize = width && width > 1024 ? '19' : '17';

  // Check for variants: use variantCount from grouped search, fallback to variations array
  const variations = Array.isArray(data?.variations) ? data.variations : [];
  const hasVariants =
    (data.variantCount && data.variantCount > 1) || variations.length > 1;

  // Check availability from ERP data
  const isOutOfStock = priceData ? Number(priceData.availability) <= 0 : false;
  const canAddToCart = priceData?.product_label_action?.ADD_TO_CART ?? true;

  function handlePopupView() {
    if (hasVariants) {
      openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', data);
    } else {
      openModal('PRODUCT_VIEW', data);
    }
  }

  // Out of stock - show label from ERP or default text
  if (isOutOfStock && !canAddToCart) {
    return (
      <span className="text-[11px] md:text-xs font-bold text-brand-light uppercase inline-block bg-brand-danger rounded-full px-2.5 pt-1 pb-[3px]">
        {priceData?.product_label_action?.LABEL || t('text-out-stock')}
      </span>
    );
  }

  // Variable product with multiple variants - show "vedi varianti" button (same style as "visualizza prodotto")
  if (hasVariants) {
    return (
      <button
        className="inline-flex items-center justify-center px-3 sm:px-6 h-8 sm:h-10 rounded-md bg-brand text-brand-light text-xs sm:text-sm font-medium transition-all hover:bg-brand/90 w-full sm:w-auto"
        onClick={handlePopupView}
      >
        {t('text-view-variants', { defaultValue: 'vedi varianti' })}
      </button>
    );
  }

  // Check if we have a valid price - if not, don't show add to cart
  const anyPD = priceData as any;
  const price =
    anyPD?.price_discount ??
    anyPD?.net_price ??
    anyPD?.gross_price ??
    anyPD?.price_gross;
  const hasValidPrice = priceData && price != null && Number(price) > 0;

  // No valid price - don't show add to cart, just return null (visualizza prodotto button will show below)
  if (!hasValidPrice) {
    return null;
  }

  // Simple product with valid price - show add to cart
  return (
    <AddToCart
      lang={lang}
      product={data}
      priceData={priceData}
      showPlaceholder={false}
    />
  );
}

interface ProductProps {
  lang: string;
  product: Product & { variantCount?: number }; // Extended with optional variant count from grouping
  className?: string;
  priceData?: ErpPriceData;
  customStyle?: React.CSSProperties;
}

const ProductCardB2B: React.FC<ProductProps> = ({
  product,
  className,
  lang,
  priceData,
  customStyle,
}) => {
  const {
    name,
    image,
    unit,
    product_type,
    sku,
    brand,
    slug,
    description,
    model,
    quantity,
    parent_sku,
  } = product ?? {};
  const { openModal } = useModalAction();
  const { t } = useTranslation(lang, 'common');
  const likes = useLikes();
  const reminders = useReminders();
  const { isAuthorized } = useUI();
  const isFavorite = sku ? likes.isLiked(sku) : false;
  const hasReminder = sku ? reminders.hasReminder(sku) : false;
  const [likeLoading, setLikeLoading] = React.useState<boolean>(false);
  const [reminderLoading, setReminderLoading] = React.useState<boolean>(false);

  // Check if product is out of stock
  const isOutOfStock = priceData ? Number(priceData.availability) <= 0 : false;

  // Check if this is a grouped product with multiple variants (skip price display)
  const hasMultipleVariants = Boolean(
    product.variantCount && product.variantCount > 1,
  );
  const { settings } = useHomeSettings();
  const globalCardStyle = settings?.cardStyle;
  const hoverEffect = globalCardStyle?.hoverEffect;
  const derivedStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (customStyle) return customStyle;
    if (!globalCardStyle) return undefined;
    return getCardStyleCSS(globalCardStyle);
  }, [customStyle, globalCardStyle]);

  const hoverClass = React.useMemo(() => {
    if (customStyle) return '';
    if (!globalCardStyle) return '';
    return getCardHoverClass(globalCardStyle.hoverEffect);
  }, [customStyle, globalCardStyle]);

  const hoverBackgroundColor =
    !customStyle && hoverEffect !== 'shadow'
      ? globalCardStyle?.hoverBackgroundColor
      : undefined;

  const hoverBackgroundClass = React.useMemo(() => {
    if (!hoverBackgroundColor) return undefined;
    return `card-hover-bg-${hoverBackgroundColor.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
  }, [hoverBackgroundColor]);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!hoverBackgroundClass || !hoverBackgroundColor) return;
    const styleId = `hover-style-${hoverBackgroundClass}`;
    if (document.getElementById(styleId)) return;
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.textContent = `.${hoverBackgroundClass}:hover { background-color: ${hoverBackgroundColor}; }`;
    document.head.appendChild(styleTag);
  }, [hoverBackgroundClass, hoverBackgroundColor]);

  const combinedClassName = React.useMemo(
    () =>
      cn(
        'flex flex-col group overflow-hidden cursor-pointer transition-all duration-300 relative h-full border border-[#EAEEF2] rounded-2xl',
        className,
        hoverClass,
        hoverBackgroundClass,
        hoverBackgroundColor ? 'transition-colors duration-200' : null,
      ),
    [className, hoverClass, hoverBackgroundClass, hoverBackgroundColor],
  );

  function handlePopupView() {
    // Use variantCount from grouped search, fallback to variations array
    const variations = Array.isArray(product.variations)
      ? product.variations
      : [];
    const hasVariants =
      (product.variantCount && product.variantCount > 1) ||
      variations.length > 1;

    if (hasVariants) {
      openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', product);
    } else {
      openModal('PRODUCT_VIEW', product);
    }
  }

  return (
    <article className={combinedClassName} style={derivedStyle} title={name}>
      {/* Product Image */}
      <div className="relative shrink-0" onClick={handlePopupView}>
        <div className="overflow-hidden mx-auto w-full aspect-square max-w-[140px] sm:max-w-[180px] md:max-w-[200px] transition duration-200 ease-in-out transform group-hover:scale-105 relative cursor-pointer">
          <Image
            src={
              image?.thumbnail && image.thumbnail.trim() !== ''
                ? image.thumbnail
                : productPlaceholder
            }
            alt={name || 'Product Image'}
            quality={100}
            fill
            sizes="(max-width: 640px) 140px, (max-width: 768px) 180px, 200px"
            className="object-contain bg-white pointer-events-none p-1 sm:p-2"
          />
        </div>

        {/* Left badge: Parent SKU */}
        {parent_sku && (
          <div className="absolute top-0 left-0 z-10">
            <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-brand uppercase bg-[#DADADA] px-1.5 py-1 sm:px-2 sm:py-1.5">
              {parent_sku}
            </span>
          </div>
        )}

        {/* Right badge: PROMO - show if priceData.is_promo OR product.has_active_promo */}
        {(priceData?.is_promo || product.has_active_promo) && (
          <div className="absolute top-0 right-0 z-10">
            <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-white uppercase bg-red-600 px-1.5 py-1 sm:px-2 sm:py-1.5">
              PROMO
            </span>
          </div>
        )}
      </div>

      {/* Textual Information Section */}
      <div className="flex flex-col px-2 sm:px-3 md:px-4 lg:px-[18px] pb-1 lg:pb-1 lg:pt-1.5 flex-1 space-y-1">
        {/* SKU + Brand + Favorite (single line) */}
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 gap-1 sm:gap-2 min-w-0">
          <div className="flex items-center whitespace-nowrap gap-1.5 min-w-0 flex-1 overflow-hidden">
            {/* Only show SKU if different from parent_sku (badge already shows parent_sku) */}
            {sku && sku !== parent_sku && (
              <span className="uppercase">{sku}</span>
            )}

            {brand?.name && (brand as any)?.brand_id && (
              <>
                {/* Only show bullet if SKU is also shown */}
                {sku && sku !== parent_sku && (
                  <span className="text-gray-300">•</span>
                )}
                <Link
                  href={`/${lang}/search?filters-brand_id=${(brand as any).brand_id}`}
                  className="text-brand hover:underline uppercase truncate max-w-[55%] sm:max-w-[60%]"
                  title={brand.name}
                >
                  {brand.name}
                </Link>
              </>
            )}
          </div>

          {isAuthorized && priceData && (
            <div className="flex items-center gap-1">
              {/* Reminder Bell - only show when out of stock */}
              {isOutOfStock && (
                <button
                  type="button"
                  aria-label="Toggle reminder"
                  className={cn(
                    'shrink-0 p-1 rounded transition-colors',
                    hasReminder
                      ? 'text-yellow-500'
                      : 'text-gray-400 hover:text-yellow-500',
                  )}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      setReminderLoading(true);
                      if (!sku) return;
                      await reminders.toggle(sku);
                    } finally {
                      setReminderLoading(false);
                    }
                  }}
                  disabled={reminderLoading || !sku}
                  title={
                    hasReminder
                      ? t('text-reminder-active')
                      : t('text-reminder-notify')
                  }
                >
                  {hasReminder ? (
                    <IoNotifications
                      className={cn('text-[18px] animate-pulse')}
                    />
                  ) : (
                    <IoNotificationsOutline className="text-[18px]" />
                  )}
                </button>
              )}

              {/* Wishlist Heart */}
              <button
                type="button"
                aria-label="Toggle wishlist"
                className={cn(
                  'shrink-0 p-1 rounded transition-colors',
                  isFavorite
                    ? 'text-[#6D727F]'
                    : 'text-gray-400 hover:text-brand',
                )}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    setLikeLoading(true);
                    if (!sku) return;
                    await likes.toggle(sku);
                  } finally {
                    setLikeLoading(false);
                  }
                }}
                disabled={likeLoading || !sku}
                title={isFavorite ? t('text-wishlist') : t('text-wishlist')}
              >
                {isFavorite ? (
                  <IoIosHeart className="text-[18px]" />
                ) : (
                  <IoIosHeartEmpty className="text-[18px]" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Product Name - 2 lines */}
        <h3
          className="text-brand-dark text-[11px] sm:text-sm lg:text-[13px] leading-[0.8rem] sm:leading-4 font-normal line-clamp-2 min-h-[1.6rem] sm:min-h-[2rem]"
          onClick={handlePopupView}
        >
          {name || 'Product name missing'}
        </h3>

        {/* Model */}
        {model && (
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">
            {model}
          </span>
        )}

        {/* Product Description - show for variants to maintain consistent height */}
        {(() => {
          const variations = Array.isArray(product.variations)
            ? product.variations
            : [];
          const hasVariants =
            (product.variantCount && product.variantCount > 1) ||
            variations.length > 1;
          if (hasVariants && description) {
            return (
              <p className="text-xs text-gray-600 line-clamp-4 min-h-[4rem]">
                {description}
              </p>
            );
          }
          return null;
        })()}
      </div>

      {/* Price and CTA Section */}
      <div className="flex flex-col mt-auto">
        {/* Price - only for single-variant products */}
        {priceData && (
          <PriceAndPromo
            name={name}
            sku={sku}
            priceData={priceData}
            currency="EUR"
            withSchemaOrg={true}
            onPromosClick={() => {}}
          />
        )}

        {/* CTA: "View Options" for multi-variant, Add to Cart for single */}
        <div className="flex justify-center px-1.5 sm:px-2 pb-1 sm:pb-2">
          <RenderPopupOrAddToCart
            props={{ data: product }}
            lang={lang}
            priceData={priceData}
          />
        </div>

        {/* View Product Button - only for single-variant products */}
        {!hasMultipleVariants && (
          <div className="flex justify-center px-1.5 sm:px-2 pb-1.5 sm:pb-2">
            <button
              type="button"
              onClick={handlePopupView}
              className="inline-flex items-center justify-center px-3 sm:px-6 h-8 sm:h-10 rounded-md bg-brand text-brand-light text-xs sm:text-sm font-medium transition-all hover:bg-brand/90 w-full sm:w-auto"
            >
              {t('text-view-product')}
            </button>
          </div>
        )}

        {/* Availability / Variant count - same structure for both */}
        <div className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap text-center pb-1 sm:pb-2 flex items-center justify-center">
          {hasMultipleVariants
            ? `${product.variantCount} varianti`
            : priceData
              ? Number(priceData.availability) > 0
                ? formatAvailability(
                    priceData.availability,
                    priceData.packaging_option_default?.packaging_uom,
                  )
                : (priceData.product_label_action?.LABEL ?? '—')
              : '—'}
        </div>
      </div>
    </article>
  );
};
export default ProductCardB2B;
