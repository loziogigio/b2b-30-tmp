'use client';

import { useState } from 'react';
import Button from '@components/ui/button';
import Counter from '@components/ui/counter';
import { useParams } from 'next/navigation';
import { ROUTES } from '@utils/routes';
import useWindowSize from '@utils/use-window-size';
import { useProductQuery } from '@framework/product/get-product';
import { getVariations } from '@framework/utils/get-variations';
import usePrice from '@framework/product/use-price';
import { useCart } from '@contexts/cart/cart.context';
import { generateCartItem } from '@utils/generate-cart-item';
import ProductAttributes from '@components/product/product-attributes';
import isEmpty from 'lodash/isEmpty';
import { toast } from 'react-toastify';
import ThumbnailCarousel from '@components/ui/carousel/thumbnail-carousel';
import Image from '@components/ui/image';
import CartIcon from '@components/icons/cart-icon';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import TagLabel from '@components/ui/tag-label';
import LabelIcon from '@components/icons/label-icon';
import { IoArrowRedoOutline } from 'react-icons/io5';
import SocialShareBox from '@components/ui/social-share-box';
import ProductB2BDetailsTab from '@components/product/product-details/product-b2b-tab';
import VariationPrice from './variation-price';
import isEqual from 'lodash/isEqual';
import { useTranslation } from 'src/app/i18n/client';
import { Product } from '@framework/types';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import Link from 'next/link'


const ProductB2BDetails: React.FC<{ lang: string, search: any }> = ({ lang, search }) => {
  const { data: data_results, isLoading, error } = useProductListQuery({
    address_code: '',
    per_page: 12,
    start: 1,
    customer_code: '00000',
    search: search,
  })
  const first = data_results?.[0];
  const data = Array.isArray(first?.children_items) && first.children_items.length > 0
    ? first.children_items[0]
    : first;

  const { t } = useTranslation(lang, 'common');
  const pathname = useParams();
  const { slug } = pathname;
  const { width } = useWindowSize();
  // const { data, isLoading } = useProductQuery(slug as string);
  const { addItemToCart, isInCart, getItemFromCart, isInStock } = useCart();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [attributes, setAttributes] = useState<{ [key: string]: string }>({});
  const [favorite, setFavorite] = useState<boolean>(false);
  const [quantity, setQuantity] = useState(1);
  const [addToCartLoader, setAddToCartLoader] = useState<boolean>(false);
  const [addToWishlistLoader, setAddToWishlistLoader] =
    useState<boolean>(false);
  const [shareButtonStatus, setShareButtonStatus] = useState<boolean>(false);
  const productUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}${ROUTES.PRODUCT}/${pathname.slug}`;
  const { price, basePrice, discount } = usePrice(
    data && {
      amount: data.sale_price ? data.sale_price : data.price,
      baseAmount: data.price,
      currencyCode: 'EUR',
    },
  );
  const handleChange = () => {
    setShareButtonStatus(!shareButtonStatus);
  };
  if (isLoading) return <p>Loading...</p>;
  // const variations = getVariations(data?.variations);
  const variations = {};
  const isSelected = !isEmpty(variations)
    ? !isEmpty(attributes) &&
    Object.keys(variations).every((variation) =>
      attributes.hasOwnProperty(variation),
    )
    : true;
  let selectedVariation: any = {};
  if (isSelected) {
    const dataVaiOption: any = data?.variation_options;
    selectedVariation = dataVaiOption?.find((o: any) =>
      isEqual(
        o.options.map((v: any) => v.value).sort(),
        Object.values(attributes).sort(),
      ),
    );
  }
  const item = generateCartItem(data!, selectedVariation);
  const outOfStock = isInCart(item.id) && !isInStock(item.id);
  function addToCart() {
    if (!isSelected) return;
    // to show btn feedback while product carting
    setAddToCartLoader(true);
    setTimeout(() => {
      setAddToCartLoader(false);
    }, 1500);

    const item = generateCartItem(data!, selectedVariation);
    addItemToCart(item, quantity);
    toast('Added to the bag', {
      progressClassName: 'fancy-progress-bar',
      position: width! > 768 ? 'bottom-right' : 'top-right',
      autoClose: 1500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }
  function addToWishlist() {
    // to show btn feedback while product wishlist
    setAddToWishlistLoader(true);
    setFavorite(!favorite);
    const toastStatus: string =
      favorite === true ? t('text-remove-favorite') : t('text-added-favorite');
    setTimeout(() => {
      setAddToWishlistLoader(false);
    }, 1500);
    toast(toastStatus, {
      progressClassName: 'fancy-progress-bar',
      position: width! > 768 ? 'bottom-right' : 'top-right',
      autoClose: 1500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  return (
    <div className="pt-6 pb-2 md:pt-7">
      <div className="grid-cols-10 lg:grid gap-7 2xl:gap-8">
        <div className="col-span-5 mb-6 overflow-hidden xl:col-span-6 md:mb-8 lg:mb-0">
          {!!data?.gallery?.length ? (
            <ThumbnailCarousel
              gallery={data?.gallery}
              thumbnailClassName="xl:w-[700px] 2xl:w-[900px]"
              galleryClassName="xl:w-[150px] 2xl:w-[170px]"
              lang={lang}
            />
          ) : (
            <div className="flex items-center justify-center w-auto">
              <Image
                src={data?.image?.original ?? '/product-placeholder.svg'}
                alt={data?.name!}
                width={900}
                height={680}
                style={{ width: 'auto' }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col col-span-5 shrink-0 xl:col-span-4 xl:ltr:pl-2 xl:rtl:pr-2">
          <div className="pb-3 lg:pb-5">
            <div className="md:mb-2.5 block -mt-1.5">
              <h2 className="text-lg font-medium transition-colors duration-300 text-brand-dark md:text-xl xl:text-2xl">
                {data?.name}
              </h2>
            </div>
            {/* Short description and brand image */}
            {(data?.description || data?.brand?.brand_image?.[0]) && (
              <div className="flex flex-col sm:flex-row justify-between items-start mt-2 gap-4">
                {/* Left: Short Description */}
                  <div className="text-sm text-brand-dark sm:w-4/5">
                    {data?.description && (
                      data.description
                    )}
                  </div>
                  {/* <pre>{JSON.stringify(data?.brand || {}, null, 2)}</pre> */}

                {/* Right: Brand image */}
                  {data?.brand?.brand_image?.original && (
                    <Link href={`/${lang}/search?filters-id_brand=${data.brand.id}`} className="sm:w-1/5 flex justify-start sm:justify-end">
                    <img
                      src={data.brand.brand_image.original}
                      alt={data.brand.name || 'Brand'}
                      className="w-full h-full object-contain"
                      
                    />
                  </Link>
                  )}
              </div>
            )}
          </div>

          <div className="pt-1.5 lg:pt-3 xl:pt-4 space-y-2.5 md:space-y-3.5">
            <Counter
              variant="single"
              value={selectedQuantity}
              onIncrement={() => setSelectedQuantity((prev) => prev + 1)}
              onDecrement={() =>
                setSelectedQuantity((prev) => (prev !== 1 ? prev - 1 : 1))
              }
              disabled={
                isInCart(item.id)
                  ? getItemFromCart(item.id).quantity + selectedQuantity >=
                  Number(item.stock)
                  : selectedQuantity >= Number(item.stock)
              }
              lang={lang}
            />
            <Button
              onClick={addToCart}
              className="w-full px-1.5"
              disabled={!isSelected}
              loading={addToCartLoader}
            >
              <CartIcon color="#ffffff" className="ltr:mr-3 rtl:ml-3" />
              {t('text-add-to-cart')}
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="border"
                onClick={addToWishlist}
                loading={addToWishlistLoader}
                className={`group hover:text-brand ${favorite === true && 'text-brand'
                  }`}
              >
                {favorite === true ? (
                  <IoIosHeart className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all" />
                ) : (
                  <IoIosHeartEmpty className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all group-hover:text-brand" />
                )}

                {t('text-wishlist')}
              </Button>
              <div className="relative group">
                <Button
                  variant="border"
                  className={`w-full hover:text-brand ${shareButtonStatus === true && 'text-brand'
                    }`}
                  onClick={handleChange}
                >
                  <IoArrowRedoOutline className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all group-hover:text-brand" />
                  {t('text-share')}
                </Button>
                <SocialShareBox
                  className={`absolute z-10 ltr:right-0 rtl:left-0 w-[300px] md:min-w-[400px] transition-all duration-300 ${shareButtonStatus === true
                      ? 'visible opacity-100 top-full'
                      : 'opacity-0 invisible top-[130%]'
                    }`}
                  shareUrl={productUrl}
                  lang={lang}
                />
              </div>
            </div>
          </div>
          {data?.tag && (
            <ul className="pt-5 xl:pt-6">
              <li className="relative inline-flex items-center justify-center text-sm md:text-15px text-brand-dark text-opacity-80 ltr:mr-2 rtl:ml-2 top-1">
                <LabelIcon className="ltr:mr-2 rtl:ml-2" /> {t('text-tags')}:
              </li>
              {data?.tag?.map((item: any) => (
                <li className="inline-block p-[3px]" key={`tag-${item.id}`}>
                  <TagLabel data={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ProductB2BDetailsTab lang={lang} />
    </div>
  );
};

export default ProductB2BDetails;
