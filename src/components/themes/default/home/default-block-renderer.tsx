'use client';

import Container from '@components/ui/container';
import BannerAllCarousel from '@components/common/banner-all-carousel';
import ProductsCarousel from '@components/product/products-carousel';
import LikedProductsProductsCarousel from '@components/product/feeds/liked-products-products-carousel';
import TrendingProductsCarousel from '@components/product/feeds/trending-products-carousel';
import { RichTextBlock } from '@components/blocks/RichTextBlock';
import { CustomHTMLBlock } from '@components/blocks/CustomHTMLBlock';
import { YouTubeBlock } from '@components/blocks/YouTubeBlock';
import { MediaImageBlock } from '@components/blocks/MediaImageBlock';
import HeroCarouselWithWidgets from '@components/home/HeroCarouselWithWidgets';
import ProductGalleryBlock from '@components/home/ProductGalleryBlock';
import { usePimProductListQuery } from '@framework/product/get-pim-product';

interface DefaultBlockRendererProps {
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

const MEDIA_ARROW_PREV =
  '!left-3 md:!left-4 lg:!left-6 top-1/2 -translate-y-1/2 z-30 !w-10 !h-10 md:!w-12 md:!h-12 !bg-white/90 hover:!bg-white !shadow-lg !text-gray-800';
const MEDIA_ARROW_NEXT =
  '!right-3 md:!right-4 lg:!right-6 top-1/2 -translate-y-1/2 z-30 !w-10 !h-10 md:!w-12 md:!h-12 !bg-white/90 hover:!bg-white !shadow-lg !text-gray-800';

const DefaultBlockRenderer: React.FC<DefaultBlockRendererProps> = ({
  block,
  lang,
}) => {
  const isFullWidth = block.config?.fullWidth === true;

  // Hero With Widgets Block (80/20 layout)
  if (block.type === 'hero-with-widgets') {
    const slides = block.config?.slides || [];
    if (!Array.isArray(slides) || slides.length === 0) return null;

    const transformedData = slides.map((slide: any) => ({
      id: slide.id,
      image: slide.imageDesktop?.url || slide.image?.url || '',
      mobileImage:
        slide.imageMobile?.url ||
        slide.image?.mobile?.url ||
        slide.imageDesktop?.url ||
        '',
      alt: slide.imageDesktop?.alt || slide.image?.alt || '',
      title: slide.title || '',
      description: slide.description || '',
      link: slide.link?.url || '',
      openInNewTab: slide.link?.openInNewTab || false,
    }));

    return (
      <Container fullWidth={isFullWidth}>
        <HeroCarouselWithWidgets
          slides={transformedData}
          lang={lang}
          breakpoints={getBreakpoints(block.config)}
          widgets={block.config?.widgets}
          className={block.config?.className || 'mb-12 xl:mb-8 pt-1'}
        />
      </Container>
    );
  }

  if (block.type === 'content-custom-html') {
    return <CustomHTMLBlock config={block.config} />;
  }

  // Hero Carousel Block
  if (block.type === 'carousel-hero') {
    const slides = block.config?.slides || [];
    if (slides.length === 0) return null;

    const cardStyle = block.config?.cardStyle;
    const transformedData = slides.map((slide: any) => {
      const overlayConfig = slide.overlay
        ? {
            position: slide.overlay?.position || 'bottom',
            textColor: slide.overlay?.textColor || '#ffffff',
            backgroundColor: slide.overlay?.backgroundColor || '#0f172a',
            backgroundOpacity:
              typeof slide.overlay?.backgroundOpacity === 'number'
                ? slide.overlay.backgroundOpacity
                : 0.65,
          }
        : undefined;

      return {
        id: slide.id,
        image: slide.imageDesktop?.url || '',
        mobileImage: slide.imageMobile?.url || slide.imageDesktop?.url || '',
        alt: slide.imageDesktop?.alt || '',
        title: slide.title || '',
        link: slide.link?.url || '',
        openInNewTab: slide.link?.openInNewTab || false,
        ...(overlayConfig ? { overlay: overlayConfig } : {}),
        ...(cardStyle ? { cardStyle } : {}),
      };
    });

    return (
      <Container
        fullWidth={isFullWidth}
        className={block.config?.className || 'mb-6 xl:mb-8 pt-1'}
      >
        <BannerAllCarousel
          data={transformedData}
          className="mb-0"
          lang={lang}
          breakpoints={getBreakpoints(block.config)}
          title={block.config?.title}
          itemKeyPrefix={`carousel-hero-${block.id}`}
          prevButtonClassName={MEDIA_ARROW_PREV}
          nextButtonClassName={MEDIA_ARROW_NEXT}
        />
      </Container>
    );
  }

  // Media Carousel Blocks (Promo/Brand/Flyer)
  if (
    ['carousel-promo', 'carousel-brand', 'carousel-flyer'].includes(block.type)
  ) {
    const items = block.config?.items || [];
    const cardStyle = block.config?.cardStyle;
    if (items.length === 0) return null;

    const transformedData = items.map((item: any) => {
      if (item.mediaType === 'video') {
        return {
          id: item.id,
          videoUrl: item.videoUrl || '',
          title: item.title || '',
          link: item.link?.url || '',
          openInNewTab: item.link?.openInNewTab || false,
          ...(cardStyle ? { cardStyle } : {}),
        };
      }
      return {
        id: item.id,
        image: item.imageDesktop?.url || '',
        mobileImage: item.imageMobile?.url || item.imageDesktop?.url || '',
        alt: item.imageDesktop?.alt || '',
        title: item.title || '',
        link: item.link?.url || '',
        openInNewTab: item.link?.openInNewTab || false,
        ...(cardStyle ? { cardStyle } : {}),
      };
    });

    return (
      <Container
        fullWidth={isFullWidth}
        className={block.config?.className || 'mb-6 xl:mb-8 pt-1'}
      >
        <BannerAllCarousel
          data={transformedData}
          className="mb-0"
          lang={lang}
          breakpoints={getBreakpoints(block.config)}
          key={`${block.type}-${block.id}`}
          itemKeyPrefix={`${block.type}-${block.id}`}
          title={block.config?.title}
          style={block.config?.style}
          prevButtonClassName={MEDIA_ARROW_PREV}
          nextButtonClassName={MEDIA_ARROW_NEXT}
        />
      </Container>
    );
  }

  // Product Carousel Block
  if (block.type === 'carousel-products') {
    return (
      <DefaultProductCarouselBlock
        block={block}
        lang={lang}
        isFullWidth={isFullWidth}
      />
    );
  }

  // Product Gallery Block
  if (block.type === 'carousel-gallery') {
    return (
      <DefaultProductGalleryBlock
        block={block}
        lang={lang}
        isFullWidth={isFullWidth}
      />
    );
  }

  // RichText Block
  if (block.type === 'richText' || block.type === 'content-rich-text') {
    return (
      <Container fullWidth={isFullWidth}>
        <RichTextBlock config={block.config} />
      </Container>
    );
  }

  // YouTube Block
  if (block.type === 'youtubeEmbed') {
    return (
      <Container fullWidth={isFullWidth}>
        <YouTubeBlock config={block.config} />
      </Container>
    );
  }

  // Media Image Block
  if (block.type === 'media-image') {
    return (
      <Container
        fullWidth={isFullWidth}
        className={block.config?.className || 'mb-6 xl:mb-8 pt-1'}
      >
        <MediaImageBlock config={block.config} />
      </Container>
    );
  }

  return null;
};

// --- Sub-components that use hooks (must be separate components) ---

function DefaultProductCarouselBlock({
  block,
  lang,
  isFullWidth,
}: {
  block: any;
  lang: string;
  isFullWidth: boolean;
}) {
  const dataSource: 'search' | 'liked' | 'trending' =
    block.config?.dataSource || 'search';
  const rawSearch = block.config?.searchQuery ?? '';
  const searchQuery = extractSearchText(rawSearch);
  const limit = toNumber(block.config?.limit, 12);
  const breakpoints = getBreakpoints(block.config);
  const sectionTitle = block.config?.title?.trim();
  const className = block.config?.className || 'mb-6 xl:mb-8 pt-1';

  if (dataSource === 'liked') {
    return (
      <Container fullWidth={isFullWidth} className={className}>
        <LikedProductsProductsCarousel
          lang={lang}
          carouselBreakpoint={
            Object.keys(breakpoints).length ? breakpoints : undefined
          }
          limitSkus={limit}
          sectionTitle={sectionTitle}
        />
      </Container>
    );
  }

  if (dataSource === 'trending') {
    return (
      <Container fullWidth={isFullWidth} className={className}>
        <TrendingProductsCarousel
          lang={lang}
          carouselBreakpoint={
            Object.keys(breakpoints).length ? breakpoints : undefined
          }
          limitSkus={limit}
          sectionTitle={sectionTitle}
        />
      </Container>
    );
  }

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

  return (
    <Container fullWidth={isFullWidth} className={className}>
      {!enabled ? null : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          {error?.message ?? 'Unable to load products for this search.'}
        </div>
      ) : (
        <ProductsCarousel
          sectionHeading={sectionTitle || 'Featured Products'}
          categorySlug={
            searchQuery
              ? `shop?text=${encodeURIComponent(searchQuery)}`
              : undefined
          }
          products={products}
          loading={isLoading}
          error={error?.message}
          limit={limit}
          uniqueKey={`carousel-products-${block.id}`}
          lang={lang}
          carouselBreakpoint={
            Object.keys(breakpoints).length ? breakpoints : undefined
          }
        />
      )}
    </Container>
  );
}

function DefaultProductGalleryBlock({
  block,
  lang,
  isFullWidth,
}: {
  block: any;
  lang: string;
  isFullWidth: boolean;
}) {
  const rawSearch = block.config?.searchQuery ?? '';
  const searchQuery = extractSearchText(rawSearch);
  const limit = toNumber(block.config?.limit, 12);
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
  const sectionTitle = block.config?.title?.trim();

  if (!isLoading && products.length === 0 && !error) return null;

  return (
    <Container
      fullWidth={isFullWidth}
      className={block.config?.className || 'mb-6 xl:mb-8 pt-1'}
    >
      {sectionTitle ? (
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-brand">
          {sectionTitle}
        </h2>
      ) : null}
      {!searchQuery?.trim() ? null : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
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
          loading={isLoading}
        />
      )}
    </Container>
  );
}

export default DefaultBlockRenderer;
