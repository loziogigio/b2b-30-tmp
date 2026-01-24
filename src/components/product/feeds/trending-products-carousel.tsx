'use client';

import React from 'react';
import ProductsCarousel from '@components/product/products-carousel';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import { getTrendingProductsPage } from '@framework/likes';
import { useTranslation } from 'src/app/i18n/client';

interface Props {
  lang: string;
  carouselBreakpoint?: any;
  timePeriod?: '1d' | '7d' | '30d' | '90d' | string;
  limitSkus?: number;
  sectionTitle?: string;
  className?: string;
  /** Optional URL filters to apply (e.g., { 'filters-brand_id': 'MOB' }) */
  urlFilters?: Record<string, string>;
}

export default function TrendingProductsCarousel({
  lang,
  carouselBreakpoint,
  timePeriod = '7d',
  limitSkus = 24,
  sectionTitle,
  className,
  urlFilters = {},
}: Props) {
  const [skuList, setSkuList] = React.useState<string[]>([]);
  const { t } = useTranslation(lang, 'common');
  const headingLabel = sectionTitle ?? t('text-trending-products');

  // Always fetch trending on mount (paginated API: page 1)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const page = await getTrendingProductsPage(
          timePeriod,
          1,
          limitSkus,
          false,
        );
        const skus = (page?.items || []).map((r) => r.sku).filter(Boolean);
        if (!mounted) return;
        setSkuList(skus);
      } catch {
        if (!mounted) return;
        setSkuList([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [timePeriod, limitSkus]);

  const hasSkus = skuList.length > 0;

  // Merge URL filters into query params
  const queryParams = React.useMemo(() => {
    const params: Record<string, any> = {
      limit: limitSkus,
      filters: {
        sku: skuList,
      },
    };
    // Add URL filters (e.g., filters-brand_id -> brand_id filter)
    Object.entries(urlFilters).forEach(([key, value]) => {
      if (key.startsWith('filters-') && value) {
        params[key] = value;
      }
    });
    return params;
  }, [limitSkus, skuList, urlFilters]);

  const {
    data = [],
    isLoading,
    error,
  } = usePimProductListQuery(queryParams, { enabled: hasSkus });

  // Hide when no SKUs, error, or no products found after loading
  if (!hasSkus || error || (!isLoading && data.length === 0)) return null;

  return (
    <ProductsCarousel
      sectionHeading={headingLabel}
      categorySlug={`search?source=trending&period=${encodeURIComponent(timePeriod)}&page_size=${limitSkus}`}
      products={data}
      loading={isLoading}
      limit={limitSkus}
      uniqueKey={`trending-skus`}
      lang={lang}
      carouselBreakpoint={carouselBreakpoint}
      className={className}
    />
  );
}
