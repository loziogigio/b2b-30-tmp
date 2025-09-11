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
import { useLikes } from '@contexts/likes/likes.context';
const AddToCart = dynamic(() => import('@components/product/add-to-cart'), {
  ssr: false,
});

interface ProductProps {
  lang: string;
  product: Product;
  className?: string;
  priceData?: ErpPriceData;
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
  const variations_count = variations.length
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

  return <AddToCart product={data} variant="venus" lang={lang} priceData={priceData} />;
}
function formatVariation(product: Product): string {
  if (product.variations.length > 0) return `${product.variations.length} variatios`;
  return ' '
}

const ProductCardB2B: React.FC<ProductProps> = ({
  product,
  className,
  lang,
  priceData
}) => {
  const { name, image, unit, product_type, sku, brand, slug, description, model, quantity, parent_sku } = product ?? {};
  const { openModal } = useModalAction();
  const { t } = useTranslation(lang, 'common');
  const likes = useLikes();
  const isFavorite = sku ? likes.isLiked(sku) : false;
  const [likeLoading, setLikeLoading] = React.useState<boolean>(false);

  const { price: finalPrice, basePrice, discount } = usePrice({
    amount: product?.sale_price ?? product?.price,
    baseAmount: product?.price,
    currencyCode: 'EUR',
  });

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
      className={cn(
        'flex flex-col group overflow-hidden cursor-pointer transition-all duration-300 relative h-full border border-[#EAEEF2] rounded',
        className,
      )}
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


      {/* Textual Information Section */}
      <div className="flex flex-col px-3 md:px-4 lg:px-[18px] pb-1 lg:pb-1 lg:pt-1.5 h-full space-y-1.5">

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

          {priceData && (
          <button
            type="button"
            aria-label="Toggle wishlist"
            className={cn(
              'shrink-0 ml-2 p-1 rounded transition-colors',
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
          )}
        </div>


        {/* Product Name */}
        <h3
          className="text-brand-dark text-10px sm:text-sm lg:text-12px leading-5 sm:leading-6 font-semibold line-clamp-1"
          onClick={handlePopupView}
        >
          {name || 'Product name missing'}
        </h3>

        {/* Product Description (optional) */}
        {description && (
          <p className="text-xs text-gray-600 line-clamp-2">{description}</p>
        )}

        {/* Product Model (optional) */}
        {model && (
          <div className="text-sm text-gray-700 line-clamp-1">
            model: <strong>{model}</strong>
          </div>
        )}
      </div>

      {/* Packaging and Availability Section */}
      <div className="flex flex-col">
        <div className="px-3 md:px-4 lg:px-[18px] w-full py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-4">
            {/* Packaging: full width on mobile, shares row on desktop */}
            <div className="flex-1">
              {priceData && <PackagingGrid pd={priceData} />}
            </div>

            {/* Ordered status: flows under on mobile, right side on desktop */}
            <div className="lg:w-auto lg:self-start">
              <div className="flex flex-col items-end text-xs text-gray-600">
                {priceData?.buy_did && (
                  <>
                    <span className="bg-gray-600 text-white px-2 py-0.5 rounded-full font-semibold text-[10px]">
                      ORDERED
                    </span>
                    <span className="text-[13px] mt-1">{priceData?.buy_did_last_date}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>


        {priceData && (
          <PriceAndPromo
            name={name}
            sku={sku}
            priceData={priceData}
            currency="EUR"
            withSchemaOrg={true}
            // className="px-3 py-1 justify-start" // optional tweaks
            onPromosClick={() => {
              // open promo modal, or show toast, etc.
              // openModal('PROMOS_LIST', priceData)
            }}
          />
        )}

        <div className='px-2'>
          {/* CTA Button or Popup Component */}
          <RenderPopupOrAddToCart props={{ data: product }} lang={lang} priceData={priceData} />
        </div>

        <div className="text-sm text-gray-400 whitespace-nowrap min-w-[60px] text-center min-h-[24px] flex items-center justify-center">
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
}
export default ProductCardB2B;
