'use client';

import React from 'react';
import ProductsCarousel from '@components/product/products-carousel';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import { useCorrelationsQuery } from '@framework/correlations';
import { useTranslation } from 'src/app/i18n/client';

interface Props {
  lang: string;
  entityCode: string; // Product entity_code to fetch correlations for
  carouselBreakpoint?: any;
  limit?: number;
  sectionTitle?: string;
  className?: string;
}

export default function CorrelatedProductsCarousel({
  lang,
  entityCode,
  carouselBreakpoint,
  limit = 12,
  sectionTitle,
  className,
}: Props) {
  const { t } = useTranslation(lang, 'common');
  const headingLabel = sectionTitle ?? t('text-related-products');

  // Fetch correlations for this product
  const { data: correlationsData, isLoading: loadingCorrelations } =
    useCorrelationsQuery(entityCode, { limit });

  // Extract target SKUs from correlations
  const targetSkus = React.useMemo(() => {
    if (!correlationsData?.correlations) return [];
    return correlationsData.correlations
      .filter((c) => c.is_active)
      .sort((a, b) => a.position - b.position)
      .map((c) => c.target_product.sku)
      .filter(Boolean);
  }, [correlationsData]);

  const hasSkus = targetSkus.length > 0;

  // Fetch full product data for correlated products
  const { data: products = [], isLoading: loadingProducts } =
    usePimProductListQuery(
      {
        limit,
        filters: {
          sku: targetSkus,
        },
      },
      { enabled: hasSkus },
    );

  // Don't render if no correlations
  if (!hasSkus && !loadingCorrelations) return null;

  return (
    <ProductsCarousel
      sectionHeading={headingLabel}
      products={products}
      loading={loadingCorrelations || loadingProducts}
      limit={limit}
      uniqueKey={`correlated-${entityCode}`}
      lang={lang}
      carouselBreakpoint={carouselBreakpoint}
      className={className}
      showSeeAll={false}
    />
  );
}
