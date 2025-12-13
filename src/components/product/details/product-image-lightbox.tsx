'use client';

import React, { useEffect } from 'react';
import Image from '@components/ui/image';
import { Swiper, SwiperSlide, FreeMode } from '@components/ui/carousel/slider';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { IoPlayCircle, IoCubeOutline } from 'react-icons/io5';

// Dynamically import model-viewer (client-side only)
let modelViewerLoaded = false;
const loadModelViewer = () => {
  if (typeof window !== 'undefined' && !modelViewerLoaded) {
    import('@google/model-viewer').then(() => {
      modelViewerLoaded = true;
    });
  }
};

type GalleryImage = {
  id?: string | number;
  original: string;
  thumbnail?: string;
  alt?: string;
  mediaType?: 'image' | 'video' | '3d-model';
  videoUrl?: string;
  modelUrl?: string;
  label?: string;
};

type Props = {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
};

export default function ProductImageLightbox({
  images,
  index,
  onClose,
  onStep,
}: Props) {
  const [zoom, setZoom] = React.useState(1);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const panRef = React.useRef({
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    panning: false,
  });
  const total = images.length;
  const current = images[index];

  // Check if current slide is interactive (video or 3D)
  const isInteractive =
    current?.mediaType === 'video' || current?.mediaType === '3d-model';

  // Load model-viewer if there are any 3D models
  const has3DModel = images.some((img) => img.mediaType === '3d-model');
  useEffect(() => {
    if (has3DModel) {
      loadModelViewer();
    }
  }, [has3DModel]);

  React.useEffect(() => {
    setZoom(1);
    setTx(0);
    setTy(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }
  }, [index]);

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!total) return;
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          onStep(1);
          break;
        case 'ArrowLeft':
          onStep(-1);
          break;
        case '+':
        case '=':
          setZoom((prev) => Math.min(prev + 0.25, 4));
          break;
        case '-':
          setZoom((prev) => Math.max(prev - 0.25, 0.5));
          break;
        case '0':
          setZoom(1);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onStep, total]);

  if (!total || !current) return null;

  const clampPan = React.useCallback((nx: number, ny: number, z: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const maxX = Math.max(0, (w * z - w) / 2);
    const maxY = Math.max(0, (h * z - h) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  }, []);

  const zoomIn = () => {
    setZoom((prev) => {
      const next = Math.min(prev + 0.25, 4);
      const clamped = clampPan(tx, ty, next);
      setTx(clamped.x);
      setTy(clamped.y);
      return next;
    });
  };
  const zoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.25, 1);
      const clamped = clampPan(tx, ty, next);
      setTx(clamped.x);
      setTy(clamped.y);
      return next;
    });
  };
  const resetZoom = () => {
    setZoom(1);
    setTx(0);
    setTy(0);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore pan start when interacting with UI controls inside the container (arrows, etc.)
    const t = e.target as HTMLElement | null;
    if (t && t.closest('[data-nopan="true"]')) {
      return; // allow normal click on controls
    }
    // Start panning immediately on press
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTx: tx,
      startTy: ty,
      panning: true,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current.panning) return;
    e.preventDefault();
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    const nx = panRef.current.startTx + dx;
    const ny = panRef.current.startTy + dy;
    const clamped = clampPan(nx, ny, zoom);
    setTx(clamped.x);
    setTy(clamped.y);
  };
  const endPan = () => {
    panRef.current.panning = false;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex h-full w-full items-stretch justify-center bg-black/90 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Product gallery lightbox"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-6xl flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium opacity-70">
            {current.alt ??
              (current.mediaType === 'video'
                ? 'Video'
                : current.mediaType === '3d-model'
                  ? '3D Model'
                  : 'Product image')}{' '}
            · {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full w-9 h-9 flex items-center justify-center border border-white/30 hover:bg-white/20"
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto px-4 pb-6">
          <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center">
            <div
              ref={containerRef}
              className="relative w-full max-w-[min(90vw,900px)] rounded-md overflow-hidden"
              style={{
                aspectRatio: '1 / 1',
                touchAction: isInteractive ? 'auto' : 'none',
                cursor: isInteractive
                  ? 'default'
                  : panRef.current.panning
                    ? 'grabbing'
                    : 'grab',
                backgroundColor:
                  current.mediaType === 'video'
                    ? '#000'
                    : current.mediaType === '3d-model'
                      ? '#e5e7eb'
                      : '#fff',
              }}
              onPointerDown={isInteractive ? undefined : onPointerDown}
              onPointerMove={isInteractive ? undefined : onPointerMove}
              onPointerUp={isInteractive ? undefined : endPan}
              onPointerLeave={isInteractive ? undefined : endPan}
              onPointerCancel={isInteractive ? undefined : endPan}
            >
              {/* Video content */}
              {current.mediaType === 'video' && current.videoUrl ? (
                <div className="absolute inset-0">
                  {current.videoUrl.includes('youtube.com') ||
                  current.videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${current.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1]}?rel=0&autoplay=1`}
                      title={current.label || 'Video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <video
                      src={current.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    >
                      Your browser does not support video playback.
                    </video>
                  )}
                </div>
              ) : current.mediaType === '3d-model' && current.modelUrl ? (
                /* 3D Model content */
                <div className="absolute inset-0">
                  {/* @ts-ignore - model-viewer is a web component */}
                  <model-viewer
                    src={current.modelUrl}
                    alt={current.label || '3D Model'}
                    auto-rotate
                    camera-controls
                    shadow-intensity="1"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              ) : (
                /* Image content (default) */
                <div
                  className="absolute inset-0 flex items-center justify-center select-none"
                  style={{
                    transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <Image
                    src={current.original}
                    alt={current.alt ?? 'Product image enlarged'}
                    fill
                    sizes="(min-width: 1024px) 70vw, 90vw"
                    className="object-contain select-none"
                  />
                </div>
              )}
              {/* Overlay arrows to change image */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStep(-1);
                }}
                aria-label="Previous image"
                data-nopan="true"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/40 text-white flex items-center justify-center"
              >
                <IoIosArrowBack />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStep(1);
                }}
                aria-label="Next image"
                data-nopan="true"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/40 text-white flex items-center justify-center"
              >
                <IoIosArrowForward />
              </button>
            </div>
          </div>
        </div>

        {/* Thumbnails carousel (centered) */}
        <div className="px-4 pb-3 flex justify-center">
          <Swiper
            modules={[FreeMode]}
            freeMode
            spaceBetween={10}
            slidesPerView={6}
            centeredSlides
            centeredSlidesBounds
            className="max-w-[min(90vw,900px)]"
            breakpoints={{
              0: { slidesPerView: 4 },
              480: { slidesPerView: 5 },
              768: { slidesPerView: 6 },
              1024: { slidesPerView: 7 },
            }}
          >
            {images.map((img, i) => (
              <SwiperSlide key={`lb-thumb-${img.id ?? i}`} className="!w-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (i !== index) onStep(i - index);
                  }}
                  className={`relative w-16 h-16 rounded-md overflow-hidden border ${i === index ? 'border-amber-500' : 'border-border-base'} bg-white`}
                  aria-label={`Show ${img.mediaType === 'video' ? 'video' : img.mediaType === '3d-model' ? '3D model' : 'image'} ${i + 1}`}
                  title={
                    img.alt ??
                    `${img.mediaType === 'video' ? 'Video' : img.mediaType === '3d-model' ? '3D Model' : 'Image'} ${i + 1}`
                  }
                >
                  {img.mediaType === '3d-model' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300">
                      <IoCubeOutline className="w-6 h-6 text-gray-500" />
                      <span className="text-[10px] font-bold text-gray-500 mt-0.5">
                        3D
                      </span>
                    </div>
                  ) : (
                    <>
                      <Image
                        src={img.thumbnail || img.original}
                        alt={img.alt ?? `Image ${i + 1}`}
                        fill
                        className="object-contain"
                      />
                      {img.mediaType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <IoPlayCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </>
                  )}
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Only show zoom controls for images */}
        {!isInteractive && (
          <div className="flex items-center justify-center gap-3 px-4 pb-6 text-sm">
            <button
              type="button"
              onClick={zoomOut}
              className="rounded-full w-10 h-10 flex items-center justify-center border border-white/30 hover:bg-white/20 text-base"
              aria-label="Zoom out"
              title="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="rounded-full w-10 h-10 flex items-center justify-center border border-white/30 hover:bg-white/20 text-xs"
              aria-label="Reset zoom"
              title="Reset"
            >
              1x
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="rounded-full w-10 h-10 flex items-center justify-center border border-white/30 hover:bg-white/20 text-base"
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
