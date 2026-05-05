import SectionHeader from '@components/common/section-header';
import ProductCardAlpine from '@components/product/product-cards/product-card-alpine';
import { Product } from '@framework/types';
import Carousel from '@components/ui/carousel/carousel';
import { SwiperSlide } from '@components/ui/carousel/slider';
import Alert from '@components/ui/alert';
import SeeAll from '@components/ui/see-all';
import ArrowIcon from '@components/icons/arrow-icon';
import useWindowSize from '@utils/use-window-size';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import cn from 'classnames';
import { getDirection } from '@utils/get-direction';
import { useMemo, useState } from 'react';
import { getThemedComponent } from '@/lib/theme/registry';
import { fetchErpPrices } from '@framework/erp/prices';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ERP_STATIC } from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';

const ThemedProductCard = getThemedComponent('ProductCard');

interface ProductsCarouselProps {
  sectionHeading?: string;
  categorySlug?: string;
  className?: string;
  products?: Product[];
  loading: boolean;
  error?: string;
  limit?: number;
  uniqueKey?: string;
  carouselBreakpoint?: {} | any;
  lang: string;
  headerImageSrc?: string;
  headerImageAlt?: string;
  showSeeAll?: boolean;
  headingPosition?: 'left' | 'center' | 'right';
  /**
   * When provided, replaces the trailing "See All" slide with a richer
   * card showing the exact total (only if `totalResults > products.length`).
   * If `totalResults <= products.length`, no trailing slide is rendered.
   */
  totalResults?: number;
  /**
   * When false, disables the desktop "bleed to the right" negative margins.
   * Default true keeps legacy homepage behavior; set to false inside
   * contained layouts (e.g. the search overlay) so the next arrow and
   * trailing card stay on-screen.
   */
  bleedRight?: boolean;
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
  headerImageSrc,
  headerImageAlt,
  showSeeAll = true,
  headingPosition = 'left',
  totalResults,
  // Default to contained — the carousel respects the Container's 1600px cap.
  // Pass `bleedRight` if a specific layout still needs the legacy edge bleed.
  bleedRight = false,
}) => {
  const { t } = useTranslation(lang, 'common');
  const { width } = useWindowSize();
  const dir = getDirection(lang);
  const [sliderEnd, setSliderEnd] = useState(false);
  const normalizedSlug = categorySlug ? `/${lang}/${categorySlug}` : '#';

  // Trailing-slide logic:
  //   - `totalResults` undefined  → legacy behavior (simple SeeAll slide)
  //   - `totalResults > shown`    → prominent "show more" card with count
  //   - `totalResults <= shown`   → omit trailing slide (everything already visible)
  const shownCount = products?.length ?? 0;
  const hasMoreResults =
    totalResults === undefined ? true : totalResults > shownCount;

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
  const { isAuthorized } = useUI();

  const erpPayload = {
    entity_codes,
    ...ERP_STATIC,
  };

  const { data: erpPricesData, isLoading: isLoadingErpPrices } = useQuery({
    queryKey: ['erp-prices', erpPayload],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: isAuthorized && erpEnabled,
  });
  // console.log('sliderEnd', sliderEnd)

  return (
    <div
      className={cn(
        'max-w-[1600px] overflow-hidden 4xl:overflow-visible mx-auto relative',
        className,
      )}
    >
      {sectionHeading ? (
        <Link
          href={normalizedSlug}
          aria-label={`See all ${sectionHeading}`}
          className="block"
        >
          <div
            className={cn(
              'mb-5 flex cursor-pointer flex-wrap items-center md:mb-6 group',
              headingPosition === 'center'
                ? 'justify-center'
                : headingPosition === 'right'
                  ? 'justify-end'
                  : 'justify-between',
            )}
          >
            {/* ⬇️ Title row with optional image before the title */}
            <div className="flex items-center gap-3">
              {headerImageSrc ? (
                <img
                  src={headerImageSrc}
                  alt={headerImageAlt || sectionHeading}
                  className="h-20 w-20 rounded object-cover sm:h-30 sm:w-30"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}

              <SectionHeader
                sectionHeading={sectionHeading}
                headingPosition={headingPosition}
                className="mb-0 group-hover:underline"
                lang={lang}
              />
            </div>
          </div>
        </Link>
      ) : null}

      {error ? (
        <div className="2xl:ltr:pr-10 2xl:rtl:pl-10">
          <Alert message={error} />
        </div>
      ) : (
        <div
          className={cn(
            'heightFull relative',
            bleedRight &&
              (dir === 'rtl'
                ? 'xl:-ml-40 2xl:-ml-28 4xl:ml-0'
                : 'xl:-mr-40 2xl:-mr-28 4xl:mr-0'),
            !sliderEnd && 'after-item-opacity',
          )}
        >
          <Carousel
            breakpoints={carouselBreakpoint || breakpoints}
            className="-mx-1.5 md:-mx-2 xl:-mx-2.5 -mt-4"
            prevButtonClassName="!left-3 md:!left-4 lg:!left-6 top-1/2 -translate-y-1/2 z-30"
            nextButtonClassName="!right-3 md:!right-4 lg:!right-6 top-1/2 -translate-y-1/2 z-30"
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
                    const variations = Array.isArray(p?.variations)
                      ? p.variations
                      : [];
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
                            (variations[0]?.gallery?.length
                              ? variations[0].gallery
                              : p.gallery) ?? [],
                          variations: [], // flattened after normalization
                        }
                      : p;

                    // Effective key for ERP lookup + React key
                    const erpKey = String(targetProduct?.id ?? p?.id ?? '');
                    const priceData = erpPricesData?.[erpKey];

                    return (
                      <SwiperSlide
                        key={`slide-${erpKey}`}
                        className="!h-auto px-1.5 md:px-2 xl:px-2.5 py-4"
                      >
                        <div className="h-full">
                          <ThemedProductCard
                            product={targetProduct}
                            lang={lang}
                            priceData={priceData}
                            className="h-full flex flex-col"
                          />
                        </div>
                      </SwiperSlide>
                    );
                  })}

                {/* See all */}
                {showSeeAll &&
                  hasMoreResults &&
                  (totalResults !== undefined ? (
                    <SwiperSlide
                      key="see-all-card"
                      className="px-1.5 md:px-2 xl:px-2.5 py-4"
                    >
                      <Link
                        href={normalizedSlug}
                        className="group flex flex-col items-center justify-center h-full min-h-[280px] rounded-lg border-2 border-dashed border-brand/40 bg-brand/5 hover:bg-brand/10 hover:border-brand transition-colors p-6 text-center"
                      >
                        <ArrowIcon
                          color="currentColor"
                          className="w-12 text-brand mb-3 transition-transform group-hover:translate-x-1"
                        />
                        <span className="text-brand font-semibold text-base leading-tight">
                          {t('text-see-all-n-results', {
                            total: totalResults,
                          }).replace('{{total}}', String(totalResults))}
                        </span>
                      </Link>
                    </SwiperSlide>
                  ) : (
                    <SwiperSlide
                      key="see-all"
                      className="p-2.5 flex items-center justify-center"
                    >
                      <SeeAll href={categorySlug} lang={lang} />
                    </SwiperSlide>
                  ))}

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
