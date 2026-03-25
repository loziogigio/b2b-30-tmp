'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from '@components/ui/link';

interface BannerItem {
  id?: string;
  image?: string;
  mobileImage?: string;
  alt?: string;
  title?: string;
  link?: string;
  openInNewTab?: boolean;
  videoUrl?: string;
  cardStyle?: any;
  overlay?: {
    position?: 'top' | 'middle' | 'bottom';
    textColor?: string;
    backgroundColor?: string;
    backgroundOpacity?: number;
  };
}

interface TimeBannerCarouselProps {
  data: BannerItem[];
  title?: string;
  lang: string;
  itemsPerView?: number;
}

function BannerSlide({ item }: { item: BannerItem }) {
  const href = item.link;
  const linkProps: Record<string, string> = {};
  if (item.openInNewTab) {
    linkProps.target = '_blank';
    linkProps.rel = 'noopener noreferrer';
  }

  const imageNode = (
    <div className="relative w-full overflow-hidden rounded-xl bg-[var(--time-gray-100)] group transition-shadow duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)]">
      {item.videoUrl ? (
        <video
          src={item.videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : item.image ? (
        <Image
          src={item.image}
          alt={item.alt || item.title || ''}
          width={800}
          height={450}
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
        />
      ) : null}

      {/* Title overlay on hover — only when API provides overlay config */}
      {item.title && item.overlay && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            height: '75%',
            background:
              'linear-gradient(180deg, rgba(217,217,217,0) 0%, #737373 100%)',
          }}
        >
          <div className="absolute bottom-4 left-0 right-0 text-center px-4">
            <span
              className="inline-block rounded-[17px] px-5 py-2 text-sm font-semibold"
              style={{
                backgroundColor:
                  item.overlay.backgroundColor || 'rgba(15,23,42,0.65)',
                color: item.overlay.textColor || '#ffffff',
              }}
            >
              {item.title}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block" {...linkProps}>
        {imageNode}
      </Link>
    );
  }

  return imageNode;
}

export default function TimeBannerCarousel({
  data,
  title,
  lang,
  itemsPerView = 3,
}: TimeBannerCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [checkScroll]);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 400, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  if (!data?.length) return null;

  const needsScroll = canScrollLeft || canScrollRight;

  // Width: for N items per view, each item takes roughly 100/N %
  const itemWidth = `calc(${100 / itemsPerView}% - ${((itemsPerView - 1) * 16) / itemsPerView}px)`;

  return (
    <div>
      {/* Title */}
      {title && (
        <h2 className="text-[22px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-display)] tracking-tight mb-4 px-1">
          {title}
        </h2>
      )}

      {/* Carousel container with overlaid arrows + dots */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
        >
          {data.map((item, i) => (
            <div
              key={item.id ?? i}
              className="shrink-0"
              style={{
                width: itemWidth,
                minWidth: '280px',
                scrollSnapAlign: 'start',
                animation: `time-fadeUp 0.4s ease ${0.05 * i}s both`,
              }}
            >
              <BannerSlide item={item} />
            </div>
          ))}
        </div>

        {/* Left arrow — only when scrollable */}
        {canScrollLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-[var(--time-dark)] transition-all hover:bg-white z-10"
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
        )}

        {/* Right arrow — only when scrollable */}
        {canScrollRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-[var(--time-dark)] transition-all hover:bg-white z-10"
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
        )}

        {/* Bottom center dots — only when scrollable */}
        {needsScroll && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-white/70 backdrop-blur-sm rounded-full px-2 py-1.5">
            {data.map((_, i) => {
              // Highlight dot based on scroll position
              const el = scrollRef.current;
              const scrollPos = el ? el.scrollLeft : 0;
              const itemW = el
                ? (el.scrollWidth - (data.length - 1) * 16) / data.length
                : 0;
              const activeIndex =
                itemW > 0 ? Math.round(scrollPos / (itemW + 16)) : 0;

              return (
                <button
                  key={i}
                  onClick={() => {
                    const container = scrollRef.current;
                    if (!container) return;
                    const w =
                      (container.scrollWidth - (data.length - 1) * 16) /
                      data.length;
                    container.scrollTo({
                      left: i * (w + 16),
                      behavior: 'smooth',
                    });
                    setTimeout(checkScroll, 350);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? 'w-7 bg-[var(--time-dark)]'
                      : 'w-2 bg-[var(--time-dark)]/30 hover:bg-[var(--time-dark)]/50'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
