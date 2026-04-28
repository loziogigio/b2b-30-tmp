'use client';

import { useId } from 'react';
import cn from 'classnames';
import BannerCard from '@components/cards/banner-card';
import Carousel from '@components/ui/carousel/carousel';
import { SwiperSlide } from 'swiper/react';
import SectionHeader from '@components/common/section-header';

interface MediaCarouselStyle {
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  paddingX?: number;
  paddingY?: number;
  backgroundColor?: string;
  customCSS?: string; // For expert users
}

const borderRadiusMap = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
};

const defaultBreakpoints = {
  '1536': {
    slidesPerView: 3,
    spaceBetween: 20,
  },
  '1280': {
    slidesPerView: 3,
    spaceBetween: 16,
  },
  '1024': {
    slidesPerView: 3,
    spaceBetween: 16,
  },
  '768': {
    slidesPerView: 2,
    spaceBetween: 16,
  },
  '520': {
    slidesPerView: 2,
    spaceBetween: 12,
  },
  '0': {
    slidesPerView: 1,
  },
};

interface CardStyleOptions {
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  shadowSize?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shadowColor?: string;
  backgroundColor?: string;
  hoverEffect?: 'none' | 'lift' | 'shadow' | 'scale' | 'border' | 'glow';
}

interface BannerProps {
  lang: string;
  data: any;
  className?: string;
  buttonSize?: 'default' | 'small';
  breakpoints?: Record<string, any>; // Optional custom breakpoints
  itemKeyPrefix?: string;
  forceFullHeight?: boolean;
  buttonGroupClassName?: string;
  prevButtonClassName?: string;
  nextButtonClassName?: string;
  title?: string;
  headingPosition?: 'left' | 'center' | 'right';
  style?: MediaCarouselStyle;
  cardStyle?: CardStyleOptions; // Default card style for all slides
  autoplay?: boolean;
  autoplaySpeed?: number; // ms between slides
  loop?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
}

const BannerAllCarousel: React.FC<BannerProps> = ({
  data,
  className = 'mb-6',
  buttonSize = 'default',
  lang,
  breakpoints,
  itemKeyPrefix = 'all-banner--key',
  forceFullHeight = false,
  buttonGroupClassName,
  prevButtonClassName,
  nextButtonClassName,
  title,
  headingPosition,
  style,
  cardStyle,
  autoplay = false,
  autoplaySpeed = 5000,
  loop = false,
  showArrows = true,
  showDots = false,
}) => {
  // Lock arrows to hidden when there's only one slide (nothing to navigate to)
  const slidesCount = Array.isArray(data) ? data.length : 0;
  const effectiveShowArrows = showArrows && slidesCount > 1;
  const effectiveShowDots = showDots && slidesCount > 1;
  const effectiveAutoplay = autoplay && slidesCount > 1;

  // Unique id for the external pagination element — keeps the dots rendered
  // BELOW the swiper (default Swiper pagination overlays the slide).
  const reactId = useId().replace(/:/g, '');
  const paginationElId = `banner-pagination-${reactId}`;
  const defaultStyle: MediaCarouselStyle = {
    borderWidth: 0,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 'none',
    paddingX: 0,
    paddingY: 0,
    backgroundColor: 'transparent',
    customCSS: '',
  };

  const styleOptions = { ...defaultStyle, ...(style || {}) };

  // Build container styles
  const containerStyle: React.CSSProperties = {
    borderWidth: styleOptions.borderWidth
      ? `${styleOptions.borderWidth}px`
      : '0',
    borderColor: styleOptions.borderColor,
    borderStyle:
      styleOptions.borderStyle === 'none' ? 'none' : styleOptions.borderStyle,
    borderRadius: borderRadiusMap[styleOptions.borderRadius || 'none'],
    paddingLeft: styleOptions.paddingX
      ? `${styleOptions.paddingX}px`
      : undefined,
    paddingRight: styleOptions.paddingX
      ? `${styleOptions.paddingX}px`
      : undefined,
    paddingTop: styleOptions.paddingY
      ? `${styleOptions.paddingY}px`
      : undefined,
    paddingBottom: styleOptions.paddingY
      ? `${styleOptions.paddingY}px`
      : undefined,
    backgroundColor: styleOptions.backgroundColor,
  };

  return (
    <>
      {styleOptions.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: styleOptions.customCSS }} />
      )}
      {/* Hide slides that overflow before Swiper initializes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .swiper:not(.swiper-initialized) .swiper-slide:not(:first-child) {
          display: none !important;
        }
        .swiper:not(.swiper-initialized) {
          overflow: hidden;
        }
        /* External pagination dots sit on a light background below the
           slider, so override Swiper's default white bullets. */
        .banner-carousel-external-pagination .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          background: #94a3b8;
          opacity: 0.5;
          transition: opacity 0.2s ease, background-color 0.2s ease;
        }
        .banner-carousel-external-pagination .swiper-pagination-bullet-active {
          background: var(--color-brand, #009f7f);
          opacity: 1;
          width: 20px;
          border-radius: 9999px;
        }
      `,
        }}
      />
      <div
        className={cn(
          className,
          forceFullHeight && 'heightFull',
          'overflow-hidden',
        )}
        style={containerStyle}
      >
        {title && (
          <div className="mb-5 md:mb-6">
            <SectionHeader
              sectionHeading={title}
              headingPosition={headingPosition}
              className="mb-0"
              lang={lang}
            />
          </div>
        )}
        <Carousel
          autoplay={
            effectiveAutoplay
              ? { delay: autoplaySpeed, disableOnInteraction: false }
              : false
          }
          loop={loop && slidesCount > 1}
          navigation={effectiveShowArrows}
          pagination={
            effectiveShowDots
              ? { clickable: true, el: `#${paginationElId}` }
              : false
          }
          breakpoints={breakpoints || defaultBreakpoints}
          buttonSize={buttonSize}
          prevActivateId="all-banner-carousel-button-prev"
          nextActivateId="all-banner-carousel-button-next"
          lang={lang}
          buttonGroupClassName={buttonGroupClassName}
          prevButtonClassName={prevButtonClassName}
          nextButtonClassName={nextButtonClassName}
          className={forceFullHeight ? 'h-full' : undefined}
        >
          {data?.map((banner: any, index: number) => {
            const slideIdentifier = banner?.id ?? index;
            // Merge default cardStyle with banner-specific cardStyle
            const mergedBanner = cardStyle
              ? {
                  ...banner,
                  cardStyle: { ...cardStyle, ...(banner?.cardStyle || {}) },
                }
              : banner;
            return (
              <SwiperSlide
                key={`${itemKeyPrefix}-${slideIdentifier}`}
                className={forceFullHeight ? 'h-full' : undefined}
              >
                <BannerCard
                  banner={mergedBanner}
                  effectActive={true}
                  lang={lang}
                  forceFullHeight={forceFullHeight}
                  noPadding={forceFullHeight}
                />
              </SwiperSlide>
            );
          })}
        </Carousel>
        {effectiveShowDots && (
          <div
            id={paginationElId}
            className="banner-carousel-external-pagination mt-3 flex items-center justify-center gap-2"
          />
        )}
      </div>
    </>
  );
};

export default BannerAllCarousel;
