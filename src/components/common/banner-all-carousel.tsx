'use client';

import cn from 'classnames';
import BannerCard from '@components/cards/banner-card';
import Carousel from '@components/ui/carousel/carousel';
import { SwiperSlide } from 'swiper/react';

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
  nextButtonClassName
}) => {
  return (
    <div className={cn(className, forceFullHeight && 'heightFull')}>
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
          return (
            <SwiperSlide key={`${itemKeyPrefix}-${slideIdentifier}`} className={forceFullHeight ? 'h-full' : undefined}>
              <BannerCard banner={banner} effectActive={true} lang={lang} forceFullHeight={forceFullHeight} noPadding={forceFullHeight} />
            </SwiperSlide>
          );
        })}
      </Carousel>
    </div>
  );
};

export default BannerAllCarousel;
