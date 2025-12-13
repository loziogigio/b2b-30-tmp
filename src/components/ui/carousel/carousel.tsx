'use client';

import cn from 'classnames';
import { useRef } from 'react';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { getDirection } from '@utils/get-direction';
import {
  Swiper,
  Navigation,
  Autoplay,
  Pagination,
  Grid,
} from '@components/ui/carousel/slider';
import 'swiper/css/autoplay';
import 'swiper/css/grid';
import 'swiper/css/pagination';
import { Swiper as SwiperTypes } from 'swiper/types';
import type { SwiperOptions } from 'swiper/types'; // << add this

type CarouselPropsType = Partial<SwiperOptions> & {
  lang: string;
  className?: string;
  buttonGroupClassName?: string;
  prevActivateId?: string;
  nextActivateId?: string;
  prevButtonClassName?: string;
  nextButtonClassName?: string;
  buttonSize?: 'default' | 'small';
  centeredSlides?: boolean;
  loop?: boolean;
  slidesPerColumn?: number;
  breakpoints?: {} | any;
  pagination?: {} | any;
  navigation?: {} | any;
  autoplay?: {} | any;
  grid?: {} | any;
  onSlideChange?: (swiper: SwiperTypes) => void;
  onSwiper?: (swiper: SwiperTypes) => void;
};

export default function Carousel({
  lang,
  children,
  className = '',
  buttonGroupClassName = '',
  prevActivateId = '',
  nextActivateId = '',
  prevButtonClassName = 'ltr:-left-3.5 rtl:-right-3.5 lg:ltr:-left-4 lg:rtl:-right-4 xl:ltr:-left-5 xl:rtl:-right-5',
  nextButtonClassName = 'ltr:-right-3.5 rtl:-left-3.5 lg:ltr:-right-4 lg:rtl:-left-4 xl:ltr:-right-5 xl:rtl:-left-5',
  buttonSize = 'default',
  breakpoints,
  navigation = true,
  pagination = false,
  loop = false,
  grid,
  autoplay,
  onSlideChange,
  onSwiper,
  ...props
}: React.PropsWithChildren<CarouselPropsType>) {
  const dir = getDirection(lang);
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  let nextButtonClasses = cn(
    'w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 text-base lg:text-lg xl:text-xl cursor-pointer flex items-center justify-center rounded-full bg-brand-light absolute transition duration-300 hover:bg-brand hover:text-brand-light focus:outline-none transform shadow-navigation',
    { '3xl:text-2xl': buttonSize === 'default' },
    nextButtonClassName,
  );
  let prevButtonClasses = cn(
    'w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 text-base lg:text-lg xl:text-xl cursor-pointer flex items-center justify-center rounded-full bg-brand-light absolute transition duration-300 hover:bg-brand hover:text-brand-light focus:outline-none transform shadow-navigation',
    { '3xl:text-2xl': buttonSize === 'default' },
    prevButtonClassName,
  );
  return (
    <div
      className={`carouselWrapper relative ${className} ${
        pagination ? 'dotsCircle' : 'dotsCircleNone'
      }`}
    >
      <Swiper
        modules={[Navigation, Autoplay, Pagination, Grid]}
        autoplay={autoplay}
        breakpoints={breakpoints}
        dir={dir}
        pagination={pagination}
        grid={grid}
        navigation={
          navigation
            ? {
                prevEl: prevActivateId.length
                  ? `#${prevActivateId}`
                  : prevRef.current!, // Assert non-null
                nextEl: nextActivateId.length
                  ? `#${nextActivateId}`
                  : nextRef.current!, // Assert non-null
              }
            : {}
        }
        onSlideChange={onSlideChange}
        onSwiper={onSwiper}
        {...props}
      >
        {children}
      </Swiper>
      {Boolean(navigation) && (
        <div
          className={`flex items-center w-full absolute top-2/4 z-10 bg-transparent pointer-events-none ${buttonGroupClassName}`}
        >
          {prevActivateId.length > 0 ? (
            <div
              className={`${prevButtonClasses} pointer-events-auto`}
              id={prevActivateId}
            >
              {dir === 'rtl' ? <IoIosArrowForward /> : <IoIosArrowBack />}
            </div>
          ) : (
            <div
              ref={prevRef}
              className={`${prevButtonClasses} pointer-events-auto`}
            >
              {dir === 'rtl' ? <IoIosArrowForward /> : <IoIosArrowBack />}
            </div>
          )}

          {nextActivateId.length > 0 ? (
            <div
              className={`${nextButtonClasses} pointer-events-auto`}
              id={nextActivateId}
            >
              {dir === 'rtl' ? <IoIosArrowBack /> : <IoIosArrowForward />}
            </div>
          ) : (
            <div
              ref={nextRef}
              className={`${nextButtonClasses} pointer-events-auto`}
            >
              {dir === 'rtl' ? <IoIosArrowBack /> : <IoIosArrowForward />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
