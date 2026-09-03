'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from '@components/ui/link';
import { useHorizontalScroll } from '@components/themes/time/shared/use-horizontal-scroll';

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
  titleAlignment?: 'left' | 'center' | 'right';
  lang: string;
  itemsPerView?: number;
  aspectRatio?: string;
  /** Aspect ratio used below the md breakpoint when a slide has its own
   *  mobile artwork (which the CMS recommends at 768x800, i.e. portrait). */
  mobileAspectRatio?: string;
  mediaHeight?: string;
  imageFit?: 'cover' | 'contain';
}

function BannerSlide({
  item,
  sizes,
  mediaStyle,
  imageFit,
  mobileAspectRatio,
}: {
  item: BannerItem;
  sizes: string;
  mediaStyle: CSSProperties;
  imageFit: 'cover' | 'contain';
  mobileAspectRatio?: string;
}) {
  const href = item.link;
  const linkProps: Record<string, string> = {};
  if (item.openInNewTab) {
    linkProps.target = '_blank';
    linkProps.rel = 'noopener noreferrer';
  }

  // Hero Slider artwork: the CMS lets editors upload a separate mobile image
  // (`imageMobile` -> `mobileImage`). Render it as a second layer that swaps at
  // the md breakpoint, so it works under SSR with no width measurement and no
  // hydration flash.
  const desktopSrc = item.image || item.mobileImage || '';
  const mobileSrc = item.mobileImage || desktopSrc;
  const hasDistinctMobile = Boolean(mobileSrc) && mobileSrc !== desktopSrc;

  // A portrait mobile image inside the wide desktop box would be letterboxed
  // down to a sliver, so give the box its own ratio below md. Both ratios go
  // through CSS vars: an inline `aspect-ratio` would outrank the md: class.
  const desktopAspectRatio = mediaStyle.aspectRatio as string | undefined;
  const useResponsiveRatio = Boolean(
    hasDistinctMobile && mobileAspectRatio && desktopAspectRatio,
  );
  const { aspectRatio: _fixedRatio, ...mediaStyleWithoutRatio } = mediaStyle;
  const boxStyle: CSSProperties = useResponsiveRatio
    ? ({
        ...mediaStyleWithoutRatio,
        '--time-ar-mobile': mobileAspectRatio,
        '--time-ar-desktop': desktopAspectRatio,
      } as CSSProperties)
    : mediaStyle;

  const imageNode = (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-[var(--time-gray-100)] group transition-shadow duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)]${
        useResponsiveRatio
          ? ' aspect-[var(--time-ar-mobile)] md:aspect-[var(--time-ar-desktop)]'
          : ''
      }`}
      style={boxStyle}
    >
      {item.videoUrl ? (
        <video
          src={item.videoUrl}
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: imageFit }}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : desktopSrc ? (
        <>
          <Image
            src={desktopSrc}
            alt={item.alt || item.title || ''}
            fill
            className={`transition-transform duration-300 group-hover:scale-[1.02] ${
              hasDistinctMobile ? 'hidden md:block' : ''
            }`}
            style={{ objectFit: imageFit }}
            sizes={sizes}
          />
          {hasDistinctMobile && (
            <Image
              src={mobileSrc}
              alt={item.alt || item.title || ''}
              fill
              className="transition-transform duration-300 group-hover:scale-[1.02] md:hidden"
              style={{ objectFit: imageFit }}
              sizes="100vw"
            />
          )}
        </>
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
  titleAlignment,
  itemsPerView = 3,
  aspectRatio = '16 / 9',
  mobileAspectRatio,
  mediaHeight,
  imageFit = 'cover',
}: TimeBannerCarouselProps) {
  const {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    scrollLeft,
    scrollRight,
  } = useHorizontalScroll({ scrollAmount: 400 });

  if (!data?.length) return null;

  const needsScroll = canScrollLeft || canScrollRight;
  const itemWidth = `calc(${100 / itemsPerView}% - ${((itemsPerView - 1) * 16) / itemsPerView}px)`;

  // Tell the browser how wide each slide actually renders so it downloads a
  // matching srcset candidate instead of upscaling a too-small one. Derived
  // from itemsPerView: a 1-up hero spans the full row (~100vw), a 3-up grid
  // ~33vw, etc. Mobile is always a single column.
  const desktopVw = Math.max(1, Math.round(100 / itemsPerView));
  const tabletVw = itemsPerView >= 2 ? 45 : 90;
  const imageSizes = `(max-width: 640px) 90vw, (max-width: 1024px) ${tabletVw}vw, ${desktopVw}vw`;
  const mediaStyle: CSSProperties = mediaHeight
    ? { height: mediaHeight }
    : { aspectRatio };

  return (
    <div>
      {title && (
        <h2
          className={`text-[22px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-display)] tracking-tight mb-4 px-1${
            titleAlignment === 'center'
              ? ' text-center'
              : titleAlignment === 'right'
                ? ' text-right'
                : ''
          }`}
        >
          {title}
        </h2>
      )}

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
              <BannerSlide
                mobileAspectRatio={mobileAspectRatio}
                item={item}
                sizes={imageSizes}
                mediaStyle={mediaStyle}
                imageFit={imageFit}
              />
            </div>
          ))}
        </div>

        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
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

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
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

        {/* Bottom dots */}
        {needsScroll && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-white/70 backdrop-blur-sm rounded-full px-2 py-1.5">
            {data.map((_, i) => {
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
