'use client';

import TimeBannerCarousel from './time-banner-carousel';
import { RichTextBlock } from '@components/blocks/RichTextBlock';
import { CustomHTMLBlock } from '@components/blocks/CustomHTMLBlock';
import { YouTubeBlock } from '@components/blocks/YouTubeBlock';
import { MediaImageBlock } from '@components/blocks/MediaImageBlock';
import ProductGalleryBlock from '@components/home/ProductGalleryBlock';
import LikedProductsProductsCarousel from '@components/product/feeds/liked-products-products-carousel';
import TrendingProductsCarousel from '@components/product/feeds/trending-products-carousel';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import TimeHeroCarousel from './time-hero-carousel';
import TimeProductCarousel from './time-product-carousel';
import TimeQuickActions from './time-quick-actions';
import Link from '@components/ui/link';

interface TimeBlockRendererProps {
  block: any;
  lang: string;
}

const toNumber = (value: unknown, fallback: number) => {
  const parsed =
    typeof value === 'string'
      ? Number.parseFloat(value)
      : typeof value === 'number'
        ? value
        : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const convertToBreakpoints = (itemsToShow: {
  desktop: number | string;
  tablet: number | string;
  mobile: number | string;
}) => {
  const desktop = toNumber(itemsToShow.desktop, 5);
  const tablet = toNumber(itemsToShow.tablet, 3);
  const mobile = toNumber(itemsToShow.mobile, 1.25);

  return {
    '1921': { slidesPerView: desktop, spaceBetween: 20 },
    '1780': { slidesPerView: desktop, spaceBetween: 20 },
    '1536': { slidesPerView: desktop, spaceBetween: 20 },
    '1280': { slidesPerView: desktop, spaceBetween: 20 },
    '1024': { slidesPerView: desktop, spaceBetween: 16 },
    '768': { slidesPerView: tablet, spaceBetween: 16 },
    '640': { slidesPerView: tablet, spaceBetween: 12 },
    '360': { slidesPerView: mobile, spaceBetween: 8 },
    '0': { slidesPerView: mobile, spaceBetween: 5 },
  };
};

const getBreakpoints = (config: any) => {
  const parseBreakpointsJSON = (value: unknown) => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
    if (typeof value === 'object') return value;
    return null;
  };

  if (config.breakpointMode === 'advanced' && config.breakpointsJSON) {
    return parseBreakpointsJSON(config.breakpointsJSON) || {};
  } else if (config.breakpointMode === 'simplified' && config.itemsToShow) {
    return convertToBreakpoints(config.itemsToShow);
  }
  return parseBreakpointsJSON(config.breakpoints) || {};
};

const extractSearchText = (urlOrQuery: string | undefined): string => {
  if (!urlOrQuery) return '';
  const trimmed = urlOrQuery.trim();
  if (trimmed.includes('?')) {
    const qs = trimmed.split('?')[1];
    if (qs) {
      const sp = new URLSearchParams(qs);
      const text = sp.get('text') || sp.get('q');
      if (text) return text;
    }
  }
  return trimmed;
};

/** Transform a slide config object to the format expected by carousels */
const transformSlide = (slide: any, cardStyle?: any) => {
  const base = {
    id: slide.id,
    image: slide.imageDesktop?.url || slide.image?.url || '',
    mobileImage:
      slide.imageMobile?.url ||
      slide.image?.mobile?.url ||
      slide.imageDesktop?.url ||
      '',
    alt: slide.imageDesktop?.alt || slide.image?.alt || '',
    title: slide.title || '',
    link: slide.link?.url || '',
    openInNewTab: slide.link?.openInNewTab || false,
    ...(cardStyle ? { cardStyle } : {}),
  };

  if (slide.overlay) {
    return {
      ...base,
      description: slide.description || '',
      tag: slide.tag || '',
      overlay: {
        position: slide.overlay.position || 'bottom',
        textColor: slide.overlay.textColor || '#ffffff',
        backgroundColor: slide.overlay.backgroundColor || '#0f172a',
        backgroundOpacity:
          typeof slide.overlay.backgroundOpacity === 'number'
            ? slide.overlay.backgroundOpacity
            : 0.65,
      },
    };
  }

  return {
    ...base,
    description: slide.description || '',
    tag: slide.tag || '',
  };
};

/** Transform a media item (image/video) to carousel format */
const transformMediaItem = (item: any, cardStyle?: any) => {
  const base = {
    id: item.id,
    title: item.title || '',
    link: item.link?.url || '',
    openInNewTab: item.link?.openInNewTab || false,
    ...(cardStyle ? { cardStyle } : {}),
  };

  if (item.mediaType === 'video') {
    return { ...base, videoUrl: item.videoUrl || '' };
  }

  return {
    ...base,
    image: item.imageDesktop?.url || '',
    mobileImage: item.imageMobile?.url || item.imageDesktop?.url || '',
    alt: item.imageDesktop?.alt || '',
  };
};

/** Standard vertical spacing between all blocks */
const BLOCK_SPACING = 'mb-10';

/**
 * Block layout wrapper — respects `fullWidth` from block config.
 * - fullWidth=false (default): max-w-[1440px] centered with horizontal padding
 * - fullWidth=true: no max-width constraint, only vertical spacing
 */
const BlockWrapper: React.FC<{
  children: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}> = ({ children, fullWidth = false, className = '' }) =>
  fullWidth ? (
    <div className={className}>{children}</div>
  ) : (
    <div className={`max-w-[1440px] mx-auto px-4 md:px-8 ${className}`}>
      {children}
    </div>
  );

function SideBanner({
  banner,
}: {
  banner: {
    title: string;
    subtitle?: string;
    label?: string;
    link?: string;
    gradient: string;
    buttonStyle: 'light' | 'red';
  };
}) {
  const content = (
    <div
      className="h-full w-full rounded-2xl overflow-hidden relative p-6 flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.01]"
      style={{ background: banner.gradient }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-[30px] -right-[30px] w-[120px] h-[120px] rounded-full bg-white/10" />
      <div className="absolute -bottom-[20px] -right-[20px] w-[100px] h-[100px] rounded-full bg-white/5" />
      <div className="relative z-[1]">
        {banner.subtitle && (
          <div className="text-[10px] font-bold text-white/70 uppercase tracking-[0.1em] mb-1.5 font-[family-name:var(--font-body)]">
            {banner.subtitle}
          </div>
        )}
        <div className="text-[18px] font-black text-white font-[family-name:var(--font-display)] leading-[1.2] whitespace-pre-line">
          {banner.title}
        </div>
      </div>
      {banner.label && (
        <span
          className={`relative z-[1] inline-flex items-center gap-1.5 self-start text-[11px] font-bold px-3.5 py-1.5 rounded-lg font-[family-name:var(--font-body)] ${
            banner.buttonStyle === 'light'
              ? 'bg-white text-[var(--time-red)]'
              : 'bg-[var(--time-red)] text-white'
          }`}
        >
          {banner.label}
          <svg
            width="14"
            height="14"
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
  );

  if (banner.link) {
    return (
      <Link href={banner.link} className="flex flex-1 min-h-0 w-full">
        {content}
      </Link>
    );
  }
  return content;
}

const TimeBlockRenderer: React.FC<TimeBlockRendererProps> = ({
  block,
  lang,
}) => {
  const isFullWidth = block.config?.fullWidth === true;

  // Hero With Widgets — grid: hero carousel + two side banners
  if (block.type === 'hero-with-widgets') {
    const slides = block.config?.slides || [];
    if (!Array.isArray(slides) || slides.length === 0) return null;

    const transformedData = slides.map((slide: any) => transformSlide(slide));

    // Side banners from config or default promotional cards
    const sideBanners: Array<{
      title: string;
      subtitle?: string;
      label?: string;
      link?: string;
      gradient: string;
      buttonStyle: 'light' | 'red';
    }> = block.config?.sideBanners || [
      {
        title: 'Tutte le\nOfferte',
        subtitle: 'Scopri le promozioni attive',
        label: 'Scopri ora',
        link: `/${lang}/search?collection=offerte`,
        gradient: 'linear-gradient(135deg, #e63946 0%, #be123c 100%)',
        buttonStyle: 'light' as const,
      },
      {
        title: 'Nuovi\nInserimenti',
        label: 'Vedi tutti',
        link: `/${lang}/search?collection=nuovi-arrivi`,
        gradient: 'linear-gradient(135deg, #1a1d23 0%, #2d3748 100%)',
        buttonStyle: 'red' as const,
      },
    ];

    const quickActions = block.config?.quickActions;

    return (
      <>
        <BlockWrapper
          fullWidth={isFullWidth}
          className={block.config?.className || ''}
        >
          <div className="pt-7 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_340px] gap-4 items-stretch">
              <div className="overflow-hidden rounded-2xl">
                <TimeHeroCarousel slides={transformedData} lang={lang} />
              </div>
              <div className="hidden lg:flex flex-col gap-4">
                {sideBanners.slice(0, 2).map((banner, idx) => (
                  <SideBanner key={idx} banner={banner} />
                ))}
              </div>
            </div>
          </div>
        </BlockWrapper>

        <BlockWrapper fullWidth={isFullWidth} className={BLOCK_SPACING}>
          <TimeQuickActions actions={quickActions} lang={lang} />
        </BlockWrapper>
      </>
    );
  }

  if (block.type === 'content-custom-html') {
    return (
      <BlockWrapper
        fullWidth={isFullWidth}
        className={`overflow-hidden ${block.config?.className || BLOCK_SPACING}`}
      >
        <CustomHTMLBlock config={block.config} />
      </BlockWrapper>
    );
  }

  // Quick Actions (standalone block)
  if (block.type === 'quick-actions') {
    return (
      <BlockWrapper
        fullWidth={isFullWidth}
        className={block.config?.className || BLOCK_SPACING}
      >
        <TimeQuickActions actions={block.config?.actions} lang={lang} />
      </BlockWrapper>
    );
  }

  // Hero Carousel
  if (block.type === 'carousel-hero') {
    const slides = block.config?.slides || [];
    if (slides.length === 0) return null;

    const showTitle = block.showTitle !== false;
    const titleAlignment = block.titleAlignment || 'left';
    const heroTitle = showTitle ? block.config?.title?.trim() : undefined;
    const cardStyle = block.config?.cardStyle;
    const transformedData = slides.map((slide: any) =>
      transformSlide(slide, cardStyle),
    );

    const heroItemsPerView = toNumber(block.config?.itemsToShow?.desktop, 1);

    return (
      <BlockWrapper
        fullWidth={isFullWidth}
        className={block.config?.className || BLOCK_SPACING}
      >
        <TimeBannerCarousel
          data={transformedData}
          title={heroTitle}
          titleAlignment={titleAlignment}
          lang={lang}
          itemsPerView={heroItemsPerView}
        />
      </BlockWrapper>
    );
  }

  // Media Carousels (Promo/Brand/Flyer)
  if (
    ['carousel-promo', 'carousel-brand', 'carousel-flyer'].includes(block.type)
  ) {
    const items = block.config?.items || [];
    const cardStyle = block.config?.cardStyle;
    if (items.length === 0) return null;

    const transformedData = items.map((item: any) =>
      transformMediaItem(item, cardStyle),
    );

    const promoItemsPerView = toNumber(block.config?.itemsToShow?.desktop, 3);

    return (
      <BlockWrapper
        fullWidth={isFullWidth}
        className={block.config?.className || BLOCK_SPACING}
      >
        <TimeBannerCarousel
          data={transformedData}
          title={block.config?.title}
          lang={lang}
          itemsPerView={promoItemsPerView}
        />
      </BlockWrapper>
    );
  }

  // Product Carousel
  if (block.type === 'carousel-products') {
    const dataSource: 'search' | 'liked' | 'trending' =
      block.config?.dataSource || 'search';
    const rawSearch = block.config?.searchQuery ?? '';
    const searchQuery = extractSearchText(rawSearch);
    const limit = toNumber(block.config?.limit, 12);
    const breakpoints = getBreakpoints(block.config);
    const showTitle = block.showTitle !== false;
    const titleAlignment = block.titleAlignment || 'left';
    const sectionTitle = showTitle
      ? block.config?.title?.trim() || undefined
      : undefined;
    const className = block.config?.className || BLOCK_SPACING;

    if (dataSource === 'liked') {
      return (
        <BlockWrapper fullWidth={isFullWidth} className={className}>
          <LikedProductsProductsCarousel
            lang={lang}
            carouselBreakpoint={
              Object.keys(breakpoints).length ? breakpoints : undefined
            }
            limitSkus={limit}
            sectionTitle={sectionTitle}
            headingPosition={titleAlignment}
          />
        </BlockWrapper>
      );
    }

    if (dataSource === 'trending') {
      return (
        <BlockWrapper fullWidth={isFullWidth} className={className}>
          <TrendingProductsCarousel
            lang={lang}
            carouselBreakpoint={
              Object.keys(breakpoints).length ? breakpoints : undefined
            }
            limitSkus={limit}
            sectionTitle={sectionTitle}
            headingPosition={titleAlignment}
          />
        </BlockWrapper>
      );
    }

    return (
      <BlockWrapper fullWidth={isFullWidth} className={className}>
        <SearchProductCarousel
          searchQuery={searchQuery}
          limit={limit}
          title={sectionTitle}
          blockId={block.id}
          lang={lang}
          breakpoints={
            Object.keys(breakpoints).length ? breakpoints : undefined
          }
        />
      </BlockWrapper>
    );
  }

  // Gallery
  if (block.type === 'carousel-gallery') {
    const rawSearch = block.config?.searchQuery ?? '';
    const searchQuery = extractSearchText(rawSearch);
    const limit = toNumber(block.config?.limit, 12);
    const enabled = Boolean(searchQuery);

    const {
      data: fetchedProducts,
      isLoading: loading,
      error,
    } = usePimProductListQuery(
      { limit, q: searchQuery },
      { enabled, groupByParent: true },
    );

    const products = fetchedProducts ?? [];
    const showTitle = block.showTitle !== false;
    const titleAlignment = block.titleAlignment || 'left';
    const sectionTitle = showTitle ? block.config?.title?.trim() : undefined;

    if (!loading && products.length === 0 && !error) return null;

    return (
      <BlockWrapper
        fullWidth={isFullWidth}
        className={block.config?.className || BLOCK_SPACING}
      >
        {sectionTitle && (
          <h2
            className={`mb-4 text-[22px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-display)] tracking-tight ${
              titleAlignment === 'center'
                ? 'text-center'
                : titleAlignment === 'right'
                  ? 'text-right'
                  : ''
            }`}
          >
            {sectionTitle}
          </h2>
        )}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
            {error?.message ?? 'Unable to load products.'}
          </div>
        ) : (
          <ProductGalleryBlock
            products={products}
            columns={
              block.config?.columns || { desktop: 4, tablet: 2, mobile: 1 }
            }
            gap={block.config?.gap}
            lang={lang}
            loading={loading}
          />
        )}
      </BlockWrapper>
    );
  }

  // RichText
  if (block.type === 'richText' || block.type === 'content-rich-text') {
    return (
      <BlockWrapper fullWidth={isFullWidth}>
        <RichTextBlock config={block.config} />
      </BlockWrapper>
    );
  }

  // YouTube
  if (block.type === 'youtubeEmbed') {
    return (
      <BlockWrapper fullWidth={isFullWidth}>
        <YouTubeBlock config={block.config} />
      </BlockWrapper>
    );
  }

  // Media Image
  if (block.type === 'media-image') {
    return (
      <BlockWrapper
        fullWidth={isFullWidth}
        className={block.config?.className || BLOCK_SPACING}
      >
        <MediaImageBlock
          config={block.config}
          showTitle={block.showTitle !== false}
          titleAlignment={block.titleAlignment || 'left'}
        />
      </BlockWrapper>
    );
  }

  return null;
};

/**
 * Internal component for search-based product carousels
 * (extracted to allow hooks at the top level)
 */
function SearchProductCarousel({
  searchQuery,
  limit,
  title,
  blockId,
  lang,
  breakpoints,
}: {
  searchQuery: string;
  limit: number;
  title: string;
  blockId: string;
  lang: string;
  breakpoints?: Record<
    string,
    { slidesPerView: number; spaceBetween?: number }
  >;
}) {
  const enabled = Boolean(searchQuery);
  const {
    data: fetchedProducts,
    isLoading,
    error,
  } = usePimProductListQuery(
    { limit, q: searchQuery },
    { enabled, groupByParent: true },
  );

  const products = fetchedProducts ?? [];

  if (!isLoading && products.length === 0 && !error) return null;
  if (!enabled) return null;

  return (
    <TimeProductCarousel
      title={title}
      products={products}
      loading={isLoading}
      error={error?.message}
      limit={limit}
      uniqueKey={`carousel-products-${blockId}`}
      lang={lang}
      categorySlug={
        searchQuery ? `shop?text=${encodeURIComponent(searchQuery)}` : undefined
      }
      breakpoints={Object.keys(breakpoints).length ? breakpoints : undefined}
    />
  );
}

export default TimeBlockRenderer;
