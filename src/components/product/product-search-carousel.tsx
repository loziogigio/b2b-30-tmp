'use client';

import ProductsCarousel from '@components/product/products-carousel';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import { LIMITS } from '@framework/utils/limits';
import type { Product } from '@framework/types';

interface ProductSearchCarouselProps {
  title: string;
  search: string | Record<string, any>;
  lang: string;
  className?: string;
  limit?: number;
  carouselBreakpoint?: any;
  customerCode?: string;
  addressCode?: string;
}

export default function ProductSearchCarousel({
  title,
  search,
  lang,
  className,
  limit = LIMITS.BEST_SELLER_PRODUCTS_LIMITS,
  carouselBreakpoint,
  customerCode = '00000',
  addressCode = '',
}: ProductSearchCarouselProps) {
  const { data, isLoading, error } = useProductListQuery({
    address_code: addressCode,
    per_page: limit,
    start: 1,
    customer_code: customerCode,
    search,
  });

  const products: Product[] = Array.isArray(data) ? data : [];

  return (
    <ProductsCarousel
      sectionHeading={title}
      products={products}
      loading={isLoading}
      error={error?.message}
      limit={limit}
      uniqueKey={`product-search-${title.replace(/\s+/g, '-').toLowerCase()}`}
      lang={lang}
      className={className}
      carouselBreakpoint={carouselBreakpoint}
    />
  );
}
