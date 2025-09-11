'use client';

import React from 'react';
import ProductsCarousel from '@components/product/products-carousel';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import { LIMITS } from '@framework/utils/limits';
import { getTrendingProducts } from '@framework/likes';

interface Props {
  lang: string;
  carouselBreakpoint?: any;
  timePeriod?: '1d' | '7d' | '30d' | '90d' | string;
  limitSkus?: number;
  sectionTitle?: string;
}

export default function TrendingProductsCarousel({
  lang,
  carouselBreakpoint,
  timePeriod = '7d',
  limitSkus = 24,
  sectionTitle = 'Trending',
}: Props) {
  const [skuJoined, setSkuJoined] = React.useState<string>('');

  // Always fetch trending on mount
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getTrendingProducts(timePeriod, limitSkus, false);
        const skus = (res || []).map((r) => r.sku).filter(Boolean);
        if (!mounted) return;
        setSkuJoined(skus.join(';'));
      } catch {
        if (!mounted) return;
        setSkuJoined('');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [timePeriod, limitSkus]);

  const hasSkus = skuJoined.length > 0;

  const { data, isLoading, error } = useProductListQuery(
    hasSkus
      ? {
          address_code: '',
          per_page: 12,
          start: 1,
          customer_code: '00000',
          search: { sku: skuJoined },
        }
      : { search: '' }
  );

  if (!hasSkus || error) return null;

  return (
    <ProductsCarousel
      sectionHeading={sectionTitle}
      categorySlug={`search?sku=${encodeURIComponent(skuJoined)}`}
      products={data}
      loading={isLoading}
      limit={LIMITS.BEST_SELLER_PRODUCTS_LIMITS}
      uniqueKey={`trending-skus`}
      lang={lang}
      carouselBreakpoint={carouselBreakpoint}
    />
  );
}

