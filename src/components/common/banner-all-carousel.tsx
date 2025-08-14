'use client';

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
  key?:string
}

const BannerAllCarousel: React.FC<BannerProps> = ({
  data,
  className = 'mb-6',
  buttonSize = 'default',
  lang,
  breakpoints,
  key = 'all-banner--key'
}) => {
  return (
    <div className={className}>
      <Carousel
        autoplay={false}
        breakpoints={breakpoints || defaultBreakpoints}
        buttonSize={buttonSize}
        prevActivateId="all-banner-carousel-button-prev"
        nextActivateId="all-banner-carousel-button-next"
        lang={lang}
      >
        {data?.map((banner: any) => (
          <SwiperSlide key={`${key}${banner.id}`}>
            <BannerCard banner={banner} effectActive={true} lang={lang} />
          </SwiperSlide>
        ))}
      </Carousel>
    </div>
  );
};

export default BannerAllCarousel;
