import {
  Swiper,
  SwiperSlide,
  SwiperOptions,
  Navigation,
  Thumbs,
  Mousewheel,
  FreeMode,
} from '@components/ui/carousel/slider';
import Image from '@components/ui/image';
import { useRef, useState } from 'react';
import cn from 'classnames';
import { productGalleryPlaceholder } from '@assets/placeholders';
import { getDirection } from '@utils/get-direction';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

interface Props {
  gallery: any[];
  thumbnailClassName?: string;
  galleryClassName?: string;
  lang: string;
  onImageClick?: (index: number) => void;
}

// product gallery breakpoints
const galleryCarouselBreakpoints = {
  '0': {
    slidesPerView: 5,
    spaceBetween: 6,
  },
};

const swiperParams: SwiperOptions = {
  slidesPerView: 1,
  spaceBetween: 0,
};

const ThumbnailCarousel: React.FC<Props> = ({
  gallery,
  thumbnailClassName = 'xl:w-[480px] 2xl:w-[620px]',
  galleryClassName = 'xl:w-28 2xl:w-[130px]',
  lang,
  onImageClick,
}) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<any>(null);
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const dir = getDirection(lang);
  const isRtl = dir === 'rtl';

  const normalizedGallery = Array.isArray(gallery) && gallery.length > 0
    ? gallery
    : [
        {
          id: 'placeholder',
          original: productGalleryPlaceholder,
          thumbnail: productGalleryPlaceholder,
          alt: 'Product image',
        },
      ];

  const hasMultiple = normalizedGallery.length > 1;

  return (
    <div
      className={cn(
        'w-full',
        'xl:flex xl:items-start xl:gap-5',
        isRtl ? 'xl:flex-row-reverse' : 'xl:flex-row'
      )}
    >
      {hasMultiple ? (
        <div className={cn('hidden xl:block shrink-0', galleryClassName)}>
          <Swiper
            id="productGalleryThumbs"
            onSwiper={setThumbsSwiper}
            spaceBetween={6}
            watchSlidesProgress={true}
            freeMode={true}
            direction="vertical"
            mousewheel={true}
            modules={[Thumbs, Mousewheel, FreeMode]}
            observer={true}
            observeParents={true}
            breakpoints={galleryCarouselBreakpoints}
            style={{ maxHeight: 620, paddingRight: 2 }}
          >
            {normalizedGallery.map((item: any, index: number) => (
              <SwiperSlide
                key={`product-thumb-gallery-${item.id ?? index}`}
                className="flex items-center justify-center overflow-hidden transition border rounded cursor-pointer border-border-base hover:opacity-75 bg-white"
              >
                <div className="relative w-full aspect-square">
                  <Image
                    src={item?.thumbnail ?? productGalleryPlaceholder}
                    alt={item?.alt ?? `Product thumb gallery ${item.id ?? index}`}
                    fill
                    sizes="(min-width:1280px) 120px, (min-width:768px) 15vw, 25vw"
                    className="object-contain"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      ) : (
        <div className={cn('hidden xl:block shrink-0', galleryClassName)}>
          <button
            type="button"
            onClick={() => onImageClick?.(0)}
            className="relative block w-full focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            aria-label="Open image in lightbox"
          >
            <div className="relative w-full aspect-square rounded-md border border-border-base bg-white">
              <Image
                src={normalizedGallery[0]?.thumbnail ?? productGalleryPlaceholder}
                alt={normalizedGallery[0]?.alt ?? 'Product thumbnail'}
                fill
                sizes="120px"
                className="object-contain"
              />
            </div>
          </button>
        </div>
      )}

      <div
        className={cn(
          'w-full mb-2.5 md:mb-3 border border-border-base overflow-hidden rounded-md relative bg-white',
          thumbnailClassName,
        )}
      >
        <Swiper
          id="productGallery"
          thumbs={{
            swiper:
              hasMultiple && thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null,
          }}
          modules={[Navigation, Thumbs]}
          navigation={{
            prevEl: prevRef.current!, // Assert non-null
            nextEl: nextRef.current!, // Assert non-null
          }}
          {...swiperParams}
        >
          {normalizedGallery.map((item: any, index: number) => {
            const content = (
              <div className="relative w-full aspect-square bg-white">
                <Image
                  src={item?.original ?? productGalleryPlaceholder}
                  alt={item?.alt ?? `Product gallery ${item.id ?? index}`}
                  fill
                  sizes="(min-width:1280px) 540px, (min-width:768px) 70vw, 100vw"
                  className="object-contain"
                  priority={index === 0}
                />
              </div>
            );

            return (
              <SwiperSlide
                key={`product-gallery-${item.id ?? index}`}
                className="flex items-center justify-center"
              >
                {onImageClick ? (
                  <button
                    type="button"
                    onClick={() => onImageClick(index)}
                    className="relative block w-full focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    aria-label="Open image in lightbox"
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </SwiperSlide>
            );
          })}
        </Swiper>
        <div className="flex items-center justify-between w-full absolute top-2/4 z-10 px-2.5">
          <div
            ref={prevRef}
            className="flex items-center justify-center text-base transition duration-300 transform -translate-y-1/2 rounded-full cursor-pointer w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 lg:text-lg xl:text-xl bg-brand-light hover:bg-brand hover:text-brand-light focus:outline-none shadow-navigation"
          >
            {dir === 'rtl' ? <IoIosArrowForward /> : <IoIosArrowBack />}
          </div>
          <div
            ref={nextRef}
            className="flex items-center justify-center text-base transition duration-300 transform -translate-y-1/2 rounded-full cursor-pointer w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 lg:text-lg xl:text-xl bg-brand-light hover:bg-brand hover:text-brand-light focus:outline-none shadow-navigation"
          >
            {dir === 'rtl' ? <IoIosArrowBack /> : <IoIosArrowForward />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailCarousel;
