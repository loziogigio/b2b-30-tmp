'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from '@components/ui/link';

type Slide = {
  id: string;
  image: string;
  mobileImage?: string;
  alt?: string;
  title?: string;
  description?: string;
  tag?: string;
  link?: string;
  openInNewTab?: boolean;
};

interface TimeHeroCarouselProps {
  slides: Slide[];
  lang: string;
  className?: string;
}

export default function TimeHeroCarousel({
  slides,
  lang,
  className,
}: TimeHeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const next = useCallback(
    () => setCurrentSlide((prev) => (prev + 1) % slides.length),
    [slides.length],
  );
  const prev = useCallback(
    () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [next, slides.length]);

  if (!slides.length) return null;

  const slide = slides[currentSlide];
  const linkTarget = slide?.openInNewTab ? '_blank' : undefined;

  const inner = (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden bg-[var(--time-gray-100)]"
      style={{ aspectRatio: '16 / 6' }}
    >
      {/* Background image — fully visible, centered */}
      {slide?.image && (
        <Image
          src={slide.image}
          alt={slide.alt || slide.title || ''}
          fill
          className="object-contain"
          priority={currentSlide === 0}
          sizes="(max-width: 768px) 100vw, 80vw"
        />
      )}

      {/* Decorative circles */}
      <div className="absolute -top-[60px] -right-[40px] w-[300px] h-[300px] rounded-full bg-white/[0.06]" />
      <div className="absolute -bottom-[80px] left-[40%] w-[400px] h-[400px] rounded-full bg-white/[0.04]" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center px-8 md:px-[60px] z-[2]">
        <div className="max-w-[600px]">
          {/* Tag badge */}
          {slide?.tag && (
            <span className="inline-block bg-[var(--time-dark)]/80 backdrop-blur-[8px] text-white text-[11px] font-bold px-3.5 py-[5px] rounded-lg mb-4 tracking-wider uppercase font-[family-name:var(--font-body)]">
              {slide.tag}
            </span>
          )}

          {/* Title */}
          {slide?.title && (
            <h1 className="text-[28px] md:text-[42px] font-black text-[var(--time-dark)] leading-[1.1] font-[family-name:var(--font-display)] tracking-tight mb-3.5 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
              {slide.title}
            </h1>
          )}

          {/* Description */}
          {slide?.description && (
            <p className="text-[14px] md:text-[15px] text-[var(--time-dark)]/70 leading-relaxed font-[family-name:var(--font-body)] max-w-[500px] mb-6 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
              {slide.description}
            </p>
          )}

          {/* CTA button */}
          {slide?.link && (
            <span className="inline-flex items-center gap-2 h-11 px-7 rounded-[10px] bg-[var(--time-dark)] text-white text-[13px] font-bold font-[family-name:var(--font-body)] tracking-wide hover:bg-[var(--time-dark)]/85 transition-all shadow-md">
              Scopri
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12,5 19,12 12,19" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/90 shadow-md flex items-center justify-center text-[var(--time-dark)] transition-all hover:bg-white z-10"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/90 shadow-md flex items-center justify-center text-[var(--time-dark)] transition-all hover:bg-white z-10"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="9,6 15,12 9,18" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-white/70 backdrop-blur-sm rounded-full px-2 py-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentSlide(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'w-7 bg-[var(--time-dark)]'
                  : 'w-2 bg-[var(--time-dark)]/30 hover:bg-[var(--time-dark)]/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (slide?.link) {
    return (
      <Link href={slide.link} target={linkTarget} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}
