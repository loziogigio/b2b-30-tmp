'use client';

import ProductsCarousel from '@components/product/products-carousel';
// import { useHidrosDemoProductsQuery } from '@framework/product/get-all-hidros-products-demo';
import { LIMITS } from '@framework/utils/limits';
import { ROUTES } from '@utils/routes';

interface HidrosDemoProductsProps {
  lang: string;
  carouselBreakpoint?: any; // Puoi sostituirlo con un tipo specifico se necessario
}

export default function HidrosDemoProducts({
  lang,
  carouselBreakpoint,
}: HidrosDemoProductsProps) {
  // const { data, isLoading, error } = useHidrosDemoProductsQuery({
  //   limit: LIMITS.BEST_SELLER_PRODUCTS_LIMITS,
  // });

  // return (
  //   <ProductsCarousel
  //     sectionHeading="text-best-sellers"
  //     categorySlug={ROUTES.PRODUCTS}
  //     products={data}
  //     loading={isLoading}
  //     error={error?.message}
  //     limit={LIMITS.BEST_SELLER_PRODUCTS_LIMITS}
  //     uniqueKey="best-sellers"
  //     lang={lang}
  //     carouselBreakpoint={carouselBreakpoint}
  //   />
  // );
}
