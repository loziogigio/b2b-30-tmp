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
}

export default function TrendingProductsCarousel({
  lang,
  carouselBreakpoint,
  timePeriod = '7d',
  limitSkus = 24,
  sectionTitle,
  className,
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

  const {
    data = [],
    isLoading,
    error,
  } = usePimProductListQuery(
    {
      limit: limitSkus,
      filters: {
        sku: skuList,
      },
    },
    { enabled: hasSkus },
  );

  if (!hasSkus || error) return null;

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
