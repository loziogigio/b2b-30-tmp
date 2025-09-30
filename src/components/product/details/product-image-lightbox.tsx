'use client';

import React from 'react';
import Image from '@components/ui/image';
import { Swiper, SwiperSlide, FreeMode } from '@components/ui/carousel/slider';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

type GalleryImage = {
  id?: string | number;
  original: string;
  thumbnail?: string;
  alt?: string;
};

type Props = {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
};

export default function ProductImageLightbox({ images, index, onClose, onStep }: Props) {
  const [zoom, setZoom] = React.useState(1);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const panRef = React.useRef({ startX: 0, startY: 0, startTx: 0, startTy: 0, panning: false });
  const total = images.length;
  const current = images[index];

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
        case 'Escape': onClose(); break;
        case 'ArrowRight': onStep(1); break;
        case 'ArrowLeft': onStep(-1); break;
        case '+':
        case '=': setZoom((prev) => Math.min(prev + 0.25, 4)); break;
        case '-': setZoom((prev) => Math.max(prev - 0.25, 0.5)); break;
        case '0': setZoom(1); break;
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
  const resetZoom = () => { setZoom(1); setTx(0); setTy(0); };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore pan start when interacting with UI controls inside the container (arrows, etc.)
    const t = e.target as HTMLElement | null;
    if (t && t.closest('[data-nopan="true"]')) {
      return; // allow normal click on controls
    }
    // Start panning immediately on press
    e.preventDefault();
    e.stopPropagation();
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
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
  const endPan = () => { panRef.current.panning = false; };

  return (
    <div
      className="fixed inset-0 z-[60] flex h-full w-full items-stretch justify-center bg-black/90 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Product gallery lightbox"
      onClick={onClose}
    >
      <div className="flex h-full w-full max-w-6xl flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium opacity-70">
            {current.alt ?? 'Product image'} · {index + 1} / {total}
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
              className="relative w-full max-w-[min(90vw,900px)] rounded-md bg-white overflow-hidden"
              style={{ aspectRatio: '1 / 1', touchAction: 'none', cursor: panRef.current.panning ? 'grabbing' as any : 'grab' as any }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPan}
              onPointerLeave={endPan}
              onPointerCancel={endPan}
            >
              <div className="absolute inset-0 flex items-center justify-center select-none"
                style={{ transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, transformOrigin: 'center center' }}>
                <Image
                  src={current.original}
                  alt={current.alt ?? 'Product image enlarged'}
                  fill
                  sizes="(min-width: 1024px) 70vw, 90vw"
                  className="object-contain select-none"
                />
              </div>
              {/* Overlay arrows to change image */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onStep(-1); }}
                aria-label="Previous image"
                data-nopan="true"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/40 text-white flex items-center justify-center"
              >
                <IoIosArrowBack />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onStep(1); }}
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
                  aria-label={`Show image ${i + 1}`}
                  title={img.alt ?? `Image ${i + 1}`}
                >
                  <Image
                    src={img.thumbnail || img.original}
                    alt={img.alt ?? `Image ${i + 1}`}
                    fill
                    className="object-contain"
                  />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

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
      </div>
    </div>
  );
}
