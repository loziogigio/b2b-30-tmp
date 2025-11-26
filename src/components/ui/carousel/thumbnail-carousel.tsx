'use client';

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
import { useRef, useState, useEffect } from 'react';
import cn from 'classnames';
import { productGalleryPlaceholder } from '@assets/placeholders';
import { getDirection } from '@utils/get-direction';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { IoPlayCircle, IoCubeOutline, IoExpandOutline } from 'react-icons/io5';

// Dynamically import model-viewer (client-side only)
let modelViewerLoaded = false;
const loadModelViewer = () => {
  if (typeof window !== 'undefined' && !modelViewerLoaded) {
    import('@google/model-viewer').then(() => {
      modelViewerLoaded = true;
    });
  }
};

interface Props {
  gallery: any[];
  thumbnailClassName?: string;
  galleryClassName?: string;
  lang: string;
  onImageClick?: (index: number) => void;
  enableMagnifier?: boolean;
  magnifierZoom?: number; // e.g., 2.5
  magnifierPanelWidth?: number; // px; height matches to keep square
  showMagnifierPanel?: boolean; // show detached zoom panel
  activationMode?: 'press' | 'hover'; // how to activate the lens
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
  enableMagnifier = false,
  magnifierZoom = 2.5,
  magnifierPanelWidth = 560,
  showMagnifierPanel = false,
  activationMode = 'press',
}) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<any>(null);
  const [mainSwiper, setMainSwiper] = useState<any>(null);
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
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

  // Load model-viewer if there are any 3D models
  const has3DModel = normalizedGallery.some((item: any) => item.mediaType === '3d-model');
  useEffect(() => {
    if (has3DModel) {
      loadModelViewer();
    }
  }, [has3DModel]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Check if current slide is interactive (video or 3D) - disable swipe for these
  const isInteractiveSlide = (index: number) => {
    const item = normalizedGallery[index];
    return item?.mediaType === 'video' || item?.mediaType === '3d-model';
  };

  // Update swipe allowance when active index changes
  useEffect(() => {
    if (mainSwiper && !mainSwiper.destroyed) {
      const shouldDisableSwipe = isInteractiveSlide(activeIndex);
      mainSwiper.allowTouchMove = !shouldDisableSwipe;
    }
  }, [activeIndex, mainSwiper, normalizedGallery]);

  const [magnifying, setMagnifying] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number; moved: boolean }>({ x: 0, y: 0, moved: false });
  const [panelPos, setPanelPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [thumbsHeight, setThumbsHeight] = useState<number>(520);

  // Keep thumbs column height in sync with main image container
  useEffect(() => {
    const el = mainContainerRef.current;
    if (!el || typeof window === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const h = Math.max(200, Math.min(620, Math.round(rect.height)));
      setThumbsHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lensW = Math.max(60, Math.round((magnifierPanelWidth / magnifierZoom)));
  const lensH = lensW; // keep square

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!enableMagnifier) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setBox({ w: rect.width, h: rect.height });
    const host = mainContainerRef.current?.getBoundingClientRect();
    if (host) setPanelPos({ left: host.right + 16, top: host.top });
    panStart.current = { x: e.clientX, y: e.clientY, moved: false };
    const x = Math.min(Math.max(e.clientX - rect.left, lensW / 2), rect.width - lensW / 2);
    const y = Math.min(Math.max(e.clientY - rect.top, lensH / 2), rect.height - lensH / 2);
    setPos({ x, y });
    setMagnifying(true);
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!enableMagnifier || !magnifying) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, lensW / 2), rect.width - lensW / 2);
    const y = Math.min(Math.max(e.clientY - rect.top, lensH / 2), rect.height - lensH / 2);
    setPos({ x, y });
    if (Math.abs(e.clientX - panStart.current.x) > 3 || Math.abs(e.clientY - panStart.current.y) > 3) {
      panStart.current.moved = true;
    }
    if (box.w !== rect.width || box.h !== rect.height) setBox({ w: rect.width, h: rect.height });
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!enableMagnifier) return;
    setMagnifying(false);
    try { (e.currentTarget as any).releasePointerCapture?.(e.pointerId); } catch {}
  }
  function onClickCapture(e: React.MouseEvent<HTMLButtonElement>) {
    if (enableMagnifier && panStart.current.moved) {
      // prevent lightbox open if user was dragging the magnifier
      e.preventDefault();
      e.stopPropagation();
      panStart.current.moved = false;
    }
  }

  // Hover mode handlers
  function onHoverEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (!enableMagnifier) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setBox({ w: rect.width, h: rect.height });
    const host = mainContainerRef.current?.getBoundingClientRect();
    if (host) setPanelPos({ left: host.right + 16, top: host.top });
    const x = Math.min(Math.max(e.clientX - rect.left, lensW / 2), rect.width - lensW / 2);
    const y = Math.min(Math.max(e.clientY - rect.top, lensH / 2), rect.height - lensH / 2);
    setPos({ x, y });
    setMagnifying(true);
  }
  function onHoverMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!enableMagnifier) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, lensW / 2), rect.width - lensW / 2);
    const y = Math.min(Math.max(e.clientY - rect.top, lensH / 2), rect.height - lensH / 2);
    setPos({ x, y });
    if (box.w !== rect.width || box.h !== rect.height) setBox({ w: rect.width, h: rect.height });
  }
  function onHoverLeave() {
    if (!enableMagnifier) return;
    setMagnifying(false);
  }

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
            style={{ height: thumbsHeight, paddingRight: 2 }}
          >
            {normalizedGallery.map((item: any, index: number) => (
              <SwiperSlide
                key={`product-thumb-gallery-${item.id ?? index}`}
                className="flex items-center justify-center overflow-hidden transition border rounded cursor-pointer border-border-base hover:opacity-75 bg-white"
              >
                <div className="relative w-full aspect-square">
                  {/* 3D model thumbnail - show gradient with icon and 3D text, no placeholder image */}
                  {item.mediaType === '3d-model' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300">
                      <IoCubeOutline className="w-8 h-8 text-gray-500" />
                      <span className="text-sm font-bold text-gray-500 mt-1">3D</span>
                    </div>
                  ) : (
                    <>
                      <Image
                        src={item?.thumbnail ?? productGalleryPlaceholder}
                        alt={item?.alt ?? `Product thumb gallery ${item.id ?? index}`}
                        fill
                        sizes="(min-width:1280px) 120px, (min-width:768px) 15vw, 25vw"
                        className="object-contain"
                      />
                      {/* Video indicator overlay */}
                      {item.mediaType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <IoPlayCircle className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </>
                  )}
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
        ref={mainContainerRef}
        className={cn(
          'w-full mb-2.5 md:mb-3 border border-border-base rounded-md relative bg-white overflow-hidden',
          thumbnailClassName,
        )}
      >
        <Swiper
          id="productGallery"
          onSwiper={setMainSwiper}
          thumbs={{
            swiper:
              hasMultiple && thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null,
          }}
          modules={[Navigation, Thumbs]}
          navigation={{
            prevEl: prevRef.current!, // Assert non-null
            nextEl: nextRef.current!, // Assert non-null
          }}
          onSlideChange={(s) => setActiveIndex(s.activeIndex || 0)}
          {...swiperParams}
        >
          {normalizedGallery.map((item: any, index: number) => {
            // Video content
            if (item.mediaType === 'video' && item.videoUrl) {
              const isYouTube = item.videoUrl?.includes('youtube.com') || item.videoUrl?.includes('youtu.be');
              const videoId = isYouTube ? item.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1] : null;

              return (
                <SwiperSlide
                  key={`product-gallery-${item.id ?? index}`}
                  className="flex items-center justify-center"
                >
                  <div className="relative w-full aspect-square bg-black">
                    {isYouTube && videoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                        title={item.label || 'Video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    ) : (
                      <video
                        src={item.videoUrl}
                        controls
                        className="absolute inset-0 w-full h-full object-contain"
                      >
                        Your browser does not support video playback.
                      </video>
                    )}
                    {item.label && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm px-3 py-2 text-center">
                        {item.label}
                      </div>
                    )}
                    {/* Zoom/expand button to open lightbox */}
                    {onImageClick && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageClick(index);
                        }}
                        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                        aria-label="Apri in lightbox"
                        title="Apri in lightbox"
                      >
                        <IoExpandOutline className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </SwiperSlide>
              );
            }

            // 3D Model content
            if (item.mediaType === '3d-model' && item.modelUrl) {
              return (
                <SwiperSlide
                  key={`product-gallery-${item.id ?? index}`}
                  className="flex items-center justify-center"
                >
                  <div className="relative w-full aspect-square bg-gradient-to-b from-gray-100 to-gray-200">
                    {/* @ts-ignore - model-viewer is a web component */}
                    <model-viewer
                      src={item.modelUrl}
                      alt={item.label || '3D Model'}
                      auto-rotate
                      camera-controls
                      shadow-intensity="1"
                      style={{ width: '100%', height: '100%' }}
                    />
                    {item.label && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm px-3 py-2 text-center">
                        {item.label}
                      </div>
                    )}
                    {/* Zoom/expand button to open lightbox */}
                    {onImageClick && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageClick(index);
                        }}
                        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                        aria-label="Apri in lightbox"
                        title="Apri in lightbox"
                      >
                        <IoExpandOutline className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </SwiperSlide>
              );
            }

            // Image content (default)
            return (
              <SwiperSlide
                key={`product-gallery-${item.id ?? index}`}
                className="flex items-center justify-center"
              >
                <div
                  className={cn(
                    'relative w-full aspect-square bg-white'
                  )}
                  onPointerDown={activationMode === 'press' && index === activeIndex ? onPointerDown : undefined}
                  onPointerMove={activationMode === 'press' && index === activeIndex ? onPointerMove : undefined}
                  onPointerUp={activationMode === 'press' && index === activeIndex ? onPointerUp : undefined}
                  onPointerLeave={activationMode === 'press' && index === activeIndex ? onPointerUp : undefined}
                  onMouseEnter={activationMode === 'hover' && index === activeIndex ? onHoverEnter : undefined}
                  onMouseMove={activationMode === 'hover' && index === activeIndex ? onHoverMove : undefined}
                  onMouseLeave={activationMode === 'hover' && index === activeIndex ? onHoverLeave : undefined}
                >
                  <Image
                    src={item?.original ?? productGalleryPlaceholder}
                    alt={item?.alt ?? `Product gallery ${item.id ?? index}`}
                    fill
                    sizes="(min-width:1280px) 540px, (min-width:768px) 70vw, 100vw"
                    className={cn(
                      "object-contain",
                      enableMagnifier && index === activeIndex && "pointer-events-none select-none"
                    )}
                    priority={index === 0}
                  />
                  {enableMagnifier && index === activeIndex && magnifying ? (
                    <div
                      className="pointer-events-none absolute rounded border-2 border-amber-400"
                      style={{
                        width: `${lensW}px`,
                        height: `${lensH}px`,
                        left: `${pos.x - lensW / 2}px`,
                        top: `${pos.y - lensH / 2}px`,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
                      }}
                    />
                  ) : null}
                  {/* Zoom/expand button to open lightbox */}
                  {onImageClick && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageClick(index);
                      }}
                      className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                      aria-label="Apri immagine ingrandita"
                      title="Apri immagine ingrandita"
                    >
                      <IoExpandOutline className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
        {/* Magnified panel (desktop, fixed so layout doesn't shift) */}
        {enableMagnifier && showMagnifierPanel && magnifying && normalizedGallery[activeIndex] ? (
          <div
            className="hidden lg:block fixed z-30 rounded-md shadow-2xl border bg-white overflow-hidden"
            style={{
              width: magnifierPanelWidth,
              height: magnifierPanelWidth,
              left: panelPos.left,
              top: panelPos.top,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${normalizedGallery[activeIndex]?.original})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${box.w * magnifierZoom}px ${box.h * magnifierZoom}px`,
                backgroundPosition: `${-(pos.x * magnifierZoom - magnifierPanelWidth / 2)}px ${-(pos.y * magnifierZoom - magnifierPanelWidth / 2)}px`,
              }}
            />
          </div>
        ) : null}
        {/* Arrows removed per request; swipe/drag still supported by Swiper */}
      </div>
    </div>
  );
};

export default ThumbnailCarousel;
