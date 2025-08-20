import cn from 'classnames';
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
}: {
  lang: string;
  props: Object;
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

  if (Number(quantity) < 1 || outOfStock) {
    return (
      <span className="text-[11px] md:text-xs font-bold text-brand-light uppercase inline-block bg-brand-danger rounded-full px-2.5 pt-1 pb-[3px] mx-0.5 sm:mx-1">
        {t('text-out-stock')}
      </span>
    );
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

  return <AddToCart data={data} variant="venus" lang={lang} />;
}

function formatAvailability(avail: number, uom: string = ''): string {
  if (typeof avail !== 'number') return `In Stock 0 ${uom}`;

  if (avail <= 0) return `In Stock 0 ${uom}`;
  if (avail <= 10) return `In Stock >1 ${uom}`;
  if (avail <= 100) return `In Stock >10 ${uom}`;
  return `In Stock  >100 ${uom}`;
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

  function PackagingGrid({ pd }: { pd?: ErpPriceData }) {
    const options = pd?.packaging_options_all ?? [];
    if (!options.length) return null;

    const uom = pd?.packaging_option_default?.packaging_uom ?? '—';
    const cols = options.length + 1; // UM + each code

    return (
      <div className="rounded-md border border-gray-200 bg-white/60">
        {/* horizontal scroll only when needed */}
        <div className="overflow-x-auto">
          <div
            className="grid gap-x-2 gap-y-1 px-2 py-1 text-[10px] sm:text-xs min-w-full"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(44px,1fr))` }}
            role="table"
            aria-label="Packaging options"
          >
            {/* header row */}
            <div className="text-center text-gray-500 font-medium">UM</div>
            {options.map((o: any) => (
              <div key={o.packaging_code} className="text-center uppercase text-gray-500 font-medium">
                {o.packaging_code}
              </div>
            ))}

            {/* values row */}
            <div className="text-center font-semibold">{uom}</div>
            {options.map((o: any) => (
              <div key={`${o.packaging_code}-val`} className="text-center font-semibold">
                {o.qty_x_packaging ?? '1'}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
            src={image?.thumbnail ?? productPlaceholder}
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

        {/* SKU + Brand (single line, small gap) */}
        <div className="flex items-center text-xs text-gray-500 whitespace-nowrap gap-1.5 min-w-0">
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


        {/* Price and Promo Section */}
        {priceData && (<div
          className="flex items-center justify-center px-3 py-1"
          itemScope
          itemType="https://schema.org/Product"
        >
          <meta itemProp="name" content={name} />
          <meta itemProp="sku" content={sku} />

          <div
            className="text-sm text-gray-800 text-left space-y-0.5"
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
          >
            <meta itemProp="priceCurrency" content="EUR" />

            <div className="grid grid-cols-[auto_auto] gap-x-2 items-center w-fit text-sm text-gray-800">

              {/* Column 1: Original Price + Discount Info (only if promo) */}
              {priceData?.discount_description && (
                <div className="flex flex-col items-end text-xs leading-tight text-gray-600">
                  <span className="line-through">{priceData?.gross_price} €</span>
                  {priceData?.discount_description && (
                    <span>{priceData.discount_description}</span>
                  )}
                </div>
              )}

              {/* Column 2: Final Price */}
              <div
                className={cn(
                  'font-bold text-left px-2 py-1 rounded text-[22px] flex items-center gap-2',
                  priceData?.is_promo ? 'text-red-500' : 'text-black'
                )}
              >
                <span itemProp="price">{priceData?.price_discount}</span> €

                {/* Show promo icon if there are multiple promos */}
                {priceData?.count_promo > 0 && (
                  <span
                    title="View all promotions"
                    className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold cursor-pointer"
                  >
                    +{priceData.count_promo}
                  </span>
                )}
              </div>

            </div>
          </div>
        </div>)}

        <div className='px-2'>
          {/* CTA Button or Popup Component */}
          <RenderPopupOrAddToCart props={{ data: product }} lang={lang} />
        </div>

        <div className="text-sm text-gray-400 whitespace-nowrap min-w-[60px] text-center min-h-[24px] flex items-center justify-center">
          {priceData
            ? formatAvailability(
              priceData.availability,
              priceData.packaging_option_default?.packaging_uom
            )
            : formatVariation(
              product
            )}
        </div>

      </div>
    </article>
  );
}
export default ProductCardB2B;
