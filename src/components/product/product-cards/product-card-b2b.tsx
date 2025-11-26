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
import { useHomeSettings, getCardStyleCSS, getCardHoverClass } from '@/hooks/use-home-settings';
import AddToCart from '../add-to-cart';
import { Eye } from '@components/icons/eye-icon';
import useWindowSize from '@utils/use-window-size';

interface RenderPopupOrAddToCartProps {
  props: { data: Product };
  lang: string;
  priceData?: ErpPriceData;
}

function RenderPopupOrAddToCart({ props, lang, priceData }: RenderPopupOrAddToCartProps) {
  const { data } = props;
  const { t } = useTranslation(lang, 'common');
  const { width } = useWindowSize();
  const { openModal } = useModalAction();
  const iconSize = width && width > 1024 ? '19' : '17';

  const variations = Array.isArray(data?.variations) ? data.variations : [];
  const hasVariants = variations.length > 1;

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

  // Variable product with multiple variants - show popup button
  if (hasVariants) {
    return (
      <button
        className="inline-flex items-center justify-center w-full h-10 rounded-md bg-brand text-brand-light font-medium transition-all hover:bg-brand/90"
        aria-label="View Options"
        onClick={handlePopupView}
      >
        <Eye width={iconSize} height={iconSize} opacity="1" className="mr-2" />
        {t('text-view-options', { defaultValue: 'View Options' })}
      </button>
    );
  }

  // Simple product - show add to cart
  return <AddToCart lang={lang} product={data} priceData={priceData} showPlaceholder={false} />;
}

interface ProductProps {
  lang: string;
  product: Product;
  className?: string;
  priceData?: ErpPriceData;
  customStyle?: React.CSSProperties;
}

const ProductCardB2B: React.FC<ProductProps> = ({
  product,
  className,
  lang,
  priceData,
  customStyle
}) => {
  const { name, image, unit, product_type, sku, brand, slug, description, model, quantity, parent_sku } = product ?? {};
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
    !customStyle && hoverEffect !== 'shadow' ? globalCardStyle?.hoverBackgroundColor : undefined;

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
        hoverBackgroundColor ? 'transition-colors duration-200' : null
      ),
    [className, hoverClass, hoverBackgroundClass, hoverBackgroundColor]
  );

  function handlePopupView() {
    const variations = Array.isArray(product.variations) ? product.variations : [];
    const variations_count = variations.length
    if (variations_count > 1) {
      openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', product);
    } else {
      openModal('PRODUCT_VIEW', product);
    }

  }



  return (
    <article
      className={combinedClassName}
      style={derivedStyle}
      title={name}
    >
      {/* Product Image */}
      <div className="relative shrink-0" onClick={handlePopupView}>
        <div className="overflow-hidden mx-auto w-full sm:w-[180px] h-[180px] md:w-[200px] md:h-[200px] transition duration-200 ease-in-out transform group-hover:scale-105 relative cursor-pointer">
          <Image
            src={image?.thumbnail && image.thumbnail.trim() !== ''
              ? image.thumbnail
              : productPlaceholder}
            alt={name || 'Product Image'}
            quality={100}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover bg-fill-thumbnail pointer-events-none"
          />
        </div>

        {/* Left badge: Parent SKU */}
        {parent_sku && (
          <div className="absolute top-0 left-0 z-10">
            <span className="text-[10px] md:text-xs font-bold text-[#405BA8] uppercase bg-[#DADADA] px-2 py-2">
              {parent_sku}
            </span>
          </div>
        )}

        {/* Right badge: PROMO */}
        {priceData?.is_promo && (
          <div className="absolute top-0 right-0 z-10">
            <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-red-600 px-2 py-2">
              PROMO
            </span>
          </div>
        )}
      </div>


      {/* Textual Information Section */}
      <div className="flex flex-col px-3 md:px-4 lg:px-[18px] pb-1 lg:pb-1 lg:pt-1.5 flex-1 space-y-1.5">

        {/* SKU + Brand + Favorite (single line) */}
        <div className="flex items-center justify-between text-xs text-gray-500 gap-2 min-w-0">
          <div className="flex items-center whitespace-nowrap gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="uppercase">{sku}</span>

            {brand?.name && brand?.id !== '0' && (
              <>
                <span className="text-gray-300">•</span>
                <Link
                  href={`/${lang}/search?filters-id_brand=${brand.id}`}
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
                    hasReminder ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
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
                  title={hasReminder ? t('text-reminder-active') : t('text-reminder-notify')}
                >
                  {hasReminder ? (
                    <IoNotifications className={cn('text-[18px] animate-pulse')} />
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
                  isFavorite ? 'text-[#6D727F]' : 'text-gray-400 hover:text-brand'
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
          className="text-brand-dark text-10px sm:text-sm lg:text-12px leading-5 sm:leading-6 font-normal line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]"
          onClick={handlePopupView}
        >
          {name || 'Product name missing'}
        </h3>

        {/* Product Description - show for variants to maintain consistent height */}
        {(() => {
          const variations = Array.isArray(product.variations) ? product.variations : [];
          const hasVariants = variations.length > 1;
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

        {/* CTA Button or Add to Cart */}
        <div className="px-2 pb-2">
          <RenderPopupOrAddToCart props={{ data: product }} lang={lang} priceData={priceData} />
        </div>

        {/* View Product Button */}
        <div className="flex justify-center px-2 pb-2">
          <button
            type="button"
            onClick={handlePopupView}
            className="inline-flex items-center justify-center px-6 h-10 rounded-md bg-brand text-brand-light font-medium transition-all hover:bg-brand/90"
          >
            {t('text-view-product')}
          </button>
        </div>

        {/* Availability text */}
        <div className="text-sm text-gray-400 whitespace-nowrap min-w-[60px] text-center min-h-[24px] flex items-center justify-center">
          {priceData
            ? (Number(priceData.availability) > 0
                ? formatAvailability(
                    priceData.availability,
                    priceData.packaging_option_default?.packaging_uom
                  )
                : (priceData.product_label_action?.LABEL ?? '—'))
            : '—'}
        </div>
      </div>
    </article>
  );
}
export default ProductCardB2B;
