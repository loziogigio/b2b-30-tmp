import SectionHeader from '@components/common/section-header';
import ProductCardAlpine from '@components/product/product-cards/product-card-alpine';
import { Product } from '@framework/types';
import Carousel from '@components/ui/carousel/carousel';
import { SwiperSlide } from '@components/ui/carousel/slider';
import Alert from '@components/ui/alert';
import SeeAll from '@components/ui/see-all';
import useWindowSize from '@utils/use-window-size';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import cn from 'classnames';
import { getDirection } from '@utils/get-direction';
import { useMemo, useState } from 'react';
import ProductCardB2B from './product-cards/product-card-b2b';
import { fetchErpPrices } from '@framework/erp/prices';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface ProductsCarouselProps {
  sectionHeading: string;
  categorySlug?: string;
  className?: string;
  products?: Product[];
  loading: boolean;
  error?: string;
  limit?: number;
  uniqueKey?: string;
  carouselBreakpoint?: {} | any;
  lang: string;
}

const breakpoints = {
  '1921': {
    slidesPerView: 6,
  },
  '1780': {
    slidesPerView: 6,
  },
  '1536': {
    slidesPerView: 5,
  },
  '1280': {
    slidesPerView: 5,
  },
  '1024': {
    slidesPerView: 4,
  },
  '640': {
    slidesPerView: 3,
  },
  '360': {
    slidesPerView: 2,
  },
  '0': {
    slidesPerView: 1,
  },
};

const ProductsCarousel: React.FC<ProductsCarouselProps> = ({
  sectionHeading,
  categorySlug,
  className = 'mb-8 lg:mb-10 xl:mb-12',
  products,
  loading,
  error,
  limit,
  uniqueKey,
  carouselBreakpoint,
  lang,
}) => {
  const { width } = useWindowSize();
  const dir = getDirection(lang);
  const [sliderEnd, setSliderEnd] = useState(false);
  const normalizedSlug = categorySlug ? `/${lang}/${categorySlug}`:'#'

  // ---- ERP: collect entity_codes from the *effective* product id ----
  const entity_codes = useMemo<string[]>(() => {
    if (!Array.isArray(products)) return [];
    return products
      .map((p: any) => {
        const variations = Array.isArray(p?.variations) ? p.variations : [];
        if (variations.length === 1) return String(variations[0]?.id ?? '');
        if (variations.length > 1) return ''; // skip multi-variation items for ERP lookup
        return String(p?.id ?? '');
      })
      .filter((v) => v && v !== '');
  }, [products]);

  const erpEnabled = entity_codes.length > 0;

  const erpPayload = {
    entity_codes,
    id_cart: '0',     // TODO: inject actual cart ID
    customer_code: '026269',// TODO: inject actual customer code
    address_code: '000000',     // TODO: inject actual address code
  };

  const { data: erpPricesData, isLoading: isLoadingErpPrices } = useQuery({
    queryKey: ['erp-prices', erpPayload],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: erpEnabled,
  });
  // console.log('sliderEnd', sliderEnd)

  return (
    <div
      className={cn(
        'max-w-[1920px] overflow-hidden 4xl:overflow-visible px-4 md:px-6 lg:px-8 2xl:ltr:pl-10 2xl:rtl:pr-10 2xl:ltr:pr-0 2xl:rtl:pl-0 4xl:ltr:pr-10 4xl:rtl:pl-10 mx-auto relative',
        className,
      )}
    >
      <Link
        href={normalizedSlug}
        aria-label={`See all ${sectionHeading}`}
        className="block"
      >
        <div className="flex flex-wrap items-center justify-between mb-5 md:mb-6 cursor-pointer group">
          <SectionHeader
            sectionHeading={sectionHeading}
            className="mb-0 group-hover:underline"
            lang={lang}
          />
        </div>
      </Link>


      {error ? (
        <div className="2xl:ltr:pr-10 2xl:rtl:pl-10">
          <Alert message={error} />
        </div>
      ) : (
        <div
          className={cn(
            'heightFull relative',
            dir === 'rtl'
              ? 'xl:-ml-40 2xl:-ml-28 4xl:ml-0'
              : 'xl:-mr-40 2xl:-mr-28 4xl:mr-0',
            !sliderEnd && 'after-item-opacity',
          )}
        >
          <Carousel
            breakpoints={carouselBreakpoint || breakpoints}
            className="-mx-1.5 md:-mx-2 xl:-mx-2.5 -mt-4"
            prevButtonClassName="ltr:-left-2 rtl:-right-2 md:ltr:-left-1 md:rtl:-right-1.5 lg:ltr:-left-2 rtl:-right-2 xl:ltr:-left-2.5 xl:rtl:-right-2.5 2xl:ltr:left-5 2xl:rtl:right-5 -top-12 3xl:top-auto 3xl:-translate-y-2"
            nextButtonClassName="xl:rtl:-translate-x-2.5 xl:lrt:translate-x-2.5 end-2 xl:end-40 -top-12 3xl:top-auto transform 2xl:translate-x-0 3xl:-translate-y-2 4xl:end-14"
            lang={lang}
            onSlideChange={(swiper) =>
              swiper.isEnd ? setSliderEnd(true) : setSliderEnd(false)
            }
          >
            {loading && !products?.length ? (
              Array.from({ length: limit! }).map((_, idx) => (
                <SwiperSlide
                  key={`${uniqueKey}-${idx}`}
                  className="px-1.5 md:px-2 xl:px-2.5 py-4"
                >
                  <ProductCardLoader uniqueKey={`${uniqueKey}-${idx}`} />
                </SwiperSlide>
              ))
            ) : (
              <>
                {Array.isArray(products) &&
                  products.map((p: any) => {
                    // Normalize: if exactly one variation, treat it as the product
                    const variations = Array.isArray(p?.variations) ? p.variations : [];
                    const isSingleVariation = variations.length === 1;

                    // Merge the single variation over the parent so we keep any missing fields (image, brand, etc.)
                    const targetProduct = isSingleVariation
                      ? {
                        ...p,
                        ...variations[0],
                        id_parent: p.id_parent ?? p.id,
                        parent_sku: p.parent_sku ?? p.sku,
                        image: variations[0]?.image ?? p.image,
                        gallery:
                          (variations[0]?.gallery?.length ? variations[0].gallery : p.gallery) ?? [],
                        variations: [], // flattened after normalization
                      }
                      : p;

                    // Effective key for ERP lookup + React key
                    const erpKey = String(targetProduct?.id ?? p?.id ?? '');
                    const priceData = erpPricesData?.[erpKey];

                    return (
                      <SwiperSlide
                        key={`slide-${erpKey}`}
                        className="px-1.5 md:px-2 xl:px-2.5 py-4"
                      >
                        <ProductCardB2B
                          product={targetProduct}
                          lang={lang}
                          priceData={priceData}
                        />
                      </SwiperSlide>
                    );
                  })}

                {/* See all */}
                <SwiperSlide key="see-all" className="p-2.5 flex items-center justify-center">
                  <SeeAll href={categorySlug} lang={lang} />
                </SwiperSlide>

                {/* Optional spacer for certain desktop widths */}
                {typeof width === 'number' && width > 1024 && width < 1921 ? (
                  <SwiperSlide key="spacer" aria-hidden="true" />
                ) : null}
              </>

            )}
          </Carousel>
        </div>
      )}
    </div>
  );
};

export default ProductsCarousel;
