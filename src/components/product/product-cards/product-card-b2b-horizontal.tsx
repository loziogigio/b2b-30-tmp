import cn from 'classnames';
import * as React from 'react';
import Image from '@components/ui/image';
import usePrice from '@framework/product/use-price';
import { Product } from '@framework/types';
import { useModalAction } from '@components/common/modal/modal.context';
import useWindowSize from '@utils/use-window-size';
import { Eye } from '@components/icons/eye-icon';
import { useCart } from '@contexts/cart/cart.context';
import { productPlaceholder } from '@assets/placeholders';
import dynamic from 'next/dynamic';
import { useTranslation } from 'src/app/i18n/client';
import Link from 'next/link';
import { ErpPriceData } from '@utils/transform/erp-prices';
import { formatAvailability } from '@utils/format-availability';
import PackagingGrid from '../packaging-grid';
import PriceAndPromo from '../price-and-promo';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import { IoNotificationsOutline, IoNotifications } from 'react-icons/io5';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useUI } from '@contexts/ui.context';

const AddToCart = dynamic(() => import('@components/product/add-to-cart'), {
  ssr: false,
});

interface ProductProps {
  lang: string;
  product: Product;
  className?: string;
  priceData?: ErpPriceData;
  customStyle?: React.CSSProperties;
}

function RenderPopupOrAddToCart({
  lang,
  props,
  priceData
}: {
  lang: string;
  props: Object;
  priceData?: ErpPriceData;
}) {
  let { data }: any = props;
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { id, quantity, product_type } = data ?? {};
  const { width } = useWindowSize();
  const { openModal } = useModalAction();
  const { isInCart, isInStock } = useCart();
  const iconSize = width! > 1024 ? '19' : '17';
  const outOfStock = isInCart(id) && !isInStock(id);

  function handlePopupView() {
    openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', data);
  }

  const variations = Array.isArray(data.variations) ? data.variations : [];
  const variations_count = variations.length;

  if (variations_count > 1) {
    return (
      <button
        className="w-full grid grid-cols-[1fr,max-content] items-center bg-[#F4F6F8] rounded-[4px] mt-[10px] no-underline transition-all text-gray-600 hover:text-black font-medium"
        aria-label="Count Button"
        onClick={handlePopupView}
      >
        <span className="flex items-center justify-center sm:hidden">
          {t('text-view')}
        </span>
        <span className="hidden sm:flex sm:items-center sm:justify-center">
          {t('text-variable-product')}
        </span>
        <span className="w-10 h-10 bg-[#E5E8EC] rounded-tr-[4px] rounded-br-[4px] flex items-center justify-center ml-auto">
          <Eye width={iconSize} height={iconSize} opacity="1" />
        </span>
      </button>
    );
  }

  if (!isAuthorized) return null;
  return <AddToCart product={data} variant="venus" lang={lang} priceData={priceData} />;
}

function formatVariation(product: Product): string {
  if (product.variations.length > 0) return `${product.variations.length} variatios`;
  return ' ';
}

const ProductCardB2BHorizontal: React.FC<ProductProps> = ({
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

  const { price: finalPrice, basePrice, discount } = usePrice({
    amount: product?.sale_price ?? product?.price,
    baseAmount: product?.price,
    currencyCode: 'EUR',
  });

  function handlePopupView() {
    const variations = Array.isArray(product.variations) ? product.variations : [];
    const variations_count = variations.length;
    if (variations_count > 1) {
      openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', product);
    } else {
      openModal('PRODUCT_VIEW', product);
    }
  }

  return (
    <article
      className={cn(
        'grid group overflow-hidden cursor-pointer transition-all duration-300 relative h-full border border-[#EAEEF2] rounded',
        'grid-cols-1 sm:grid-cols-[180px,1fr] lg:grid-cols-[200px,1fr] gap-3 sm:gap-4 p-3 sm:p-4',
        className,
      )}
      style={customStyle}
      title={name}
    >
      {/* Product Image - Left side on desktop, top on mobile */}
      <div className="relative shrink-0" onClick={handlePopupView}>
        <div className="overflow-hidden mx-auto w-full h-[180px] sm:h-[200px] transition duration-200 ease-in-out transform group-hover:scale-105 relative cursor-pointer">
          <Image
            src={image?.thumbnail && image.thumbnail.trim() !== ''
              ? image.thumbnail
              : productPlaceholder}
            alt={name || 'Product Image'}
            quality={100}
            fill
            sizes="(max-width: 640px) 100vw, 200px"
            className="object-cover bg-fill-thumbnail pointer-events-none"
          />
        </div>

        {/* Left badge: Parent SKU */}
        {parent_sku && (
          <div className="absolute top-0 left-0 z-10">
            <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-brand px-2 py-2">
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

      {/* Content Section - Right side on desktop, bottom on mobile */}
      <div className="flex flex-col h-full space-y-2">
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
                  isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-brand'
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

        {/* Product Name */}
        <h3
          className="text-brand-dark text-sm lg:text-base leading-5 sm:leading-6 font-semibold line-clamp-2"
          onClick={handlePopupView}
        >
          {name || 'Product name missing'}
        </h3>

        {/* Product Model */}
        {model && (
          <div className="text-[13px] text-gray-700">
            <span className="mr-1">model:</span>
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 align-middle',
                'text-[11px] font-semibold tracking-wide',
                'bg-brand/10 text-brand-dark border-brand/30'
              )}
              title="Model"
            >
              {model}
            </span>
          </div>
        )}

        {/* Packaging and Availability - Horizontal layout */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start flex-1">
          {/* Packaging */}
          <div className="flex-1 min-w-0">
            {priceData && <PackagingGrid pd={priceData} />}
          </div>

          {/* Ordered status */}
          {priceData?.buy_did && (
            <div className="sm:w-auto sm:self-start">
              <div className="flex flex-col items-start sm:items-end text-xs text-gray-600">
                <span className="bg-gray-600 text-white px-2 py-0.5 rounded-full font-semibold text-[10px]">
                  ORDERED
                </span>
                <span className="text-[13px] mt-1">{priceData?.buy_did_last_date}</span>
              </div>
            </div>
          )}
        </div>

        {/* Price and Promo */}
        {priceData && (
          <PriceAndPromo
            name={name}
            sku={sku}
            priceData={priceData}
            currency="EUR"
            withSchemaOrg={true}
            onPromosClick={() => {
              // open promo modal
            }}
          />
        )}

        {/* CTA Button */}
        <div className="pt-1">
          <RenderPopupOrAddToCart props={{ data: product }} lang={lang} priceData={priceData} />
        </div>

        {/* Availability */}
        <div className="text-sm text-gray-400 text-center sm:text-left min-h-[24px] flex items-center justify-center sm:justify-start">
          {priceData
            ? (Number(priceData.availability) > 0
                ? formatAvailability(
                    priceData.availability,
                    priceData.packaging_option_default?.packaging_uom
                  )
                : (priceData.product_label_action?.LABEL ?? '—'))
            : formatVariation(product)}
        </div>
      </div>
    </article>
  );
};

export default ProductCardB2BHorizontal;
