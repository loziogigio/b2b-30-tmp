'use client';

import React, { useMemo } from 'react';
import ProductsCarousel from '@components/product/products-carousel';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import { useLikes } from '@contexts/likes/likes.context';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';

interface Props {
  lang: string;
  carouselBreakpoint?: any;
  limitSkus?: number;
  sectionTitle?: string;
  className?: string;
}

export default function LikedProductsProductsCarousel({
  lang,
  carouselBreakpoint,
  limitSkus = 24,
  sectionTitle,
  className,
}: Props) {
  const { t } = useTranslation(lang, 'common');
  const likes = useLikes();
  const { isAuthorized } = useUI();

  const skuList = useMemo(
    () => (likes?.items || []).map((it) => it.sku).filter(Boolean),
    [likes?.items],
  );
  const hasLikes = skuList.length > 0;

  // Join SKUs for PIM search filter
  const skusToSearch = skuList.slice(0, limitSkus);

  const {
    data = [],
    isLoading,
    error,
  } = usePimProductListQuery(
    {
      limit: limitSkus,
      filters: {
        sku: skusToSearch,
      },
    },
    { enabled: hasLikes },
  );

  if (!isAuthorized || !hasLikes || error) return null;

  return (
    <ProductsCarousel
      sectionHeading={sectionTitle ?? t('text-wishlist')}
      categorySlug={`search?source=likes&page_size=${limitSkus}`}
      products={data}
      loading={isLoading}
      limit={limitSkus}
      uniqueKey={`likes-skus`}
      lang={lang}
      carouselBreakpoint={carouselBreakpoint}
      className={className}
    />
  );
}
