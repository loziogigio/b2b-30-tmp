'use client';

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
  style?: MediaCarouselStyle;
  cardStyle?: CardStyleOptions; // Default card style for all slides
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
  style,
  cardStyle,
}) => {
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
              className="mb-0"
              lang={lang}
            />
          </div>
        )}
        <Carousel
          autoplay={false}
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
      </div>
    </>
  );
};

export default BannerAllCarousel;
