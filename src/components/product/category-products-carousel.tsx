'use client';

import ProductsCarousel from '@components/product/products-carousel';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import { LIMITS } from '@framework/utils/limits';
import { HomeCategory } from '@utils/transform/b2b-cms-home';

interface Props {
  category: HomeCategory;
  lang: string;
  carouselBreakpoint?: any;
}

export default function CategoryProductsCarousel({
  category,
  lang,
  carouselBreakpoint
}: Props) {
  const { data, isLoading, error } = useProductListQuery({
    address_code: '',
    // filters_next_insert: '',
    per_page: 12,
    start: 1,
    search: category.url,
  });

  if (isLoading) return null;
  if (error) return null;

  return (
    <ProductsCarousel
      sectionHeading={category.label}
      categorySlug={category.url}
      products={data}
      loading={isLoading}
      limit={LIMITS.BEST_SELLER_PRODUCTS_LIMITS}
      uniqueKey={`category-${category.order}`}
      lang={lang}
      carouselBreakpoint={carouselBreakpoint}
    />
  );
}
