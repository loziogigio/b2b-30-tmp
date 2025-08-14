'use client';

import { HomeCategory } from '@utils/transform/b2b-cms-home';
import CategoryProductsCarousel from '@components/product/category-products-carousel';
interface B2BHomeProductsProps {
  lang: string;
  carouselBreakpoint?: any;
  homeCategoryFiltered?: HomeCategory[];
}

export default function B2BHomeProducts({
  lang,
  carouselBreakpoint,
  homeCategoryFiltered = [],
}: B2BHomeProductsProps) {
  return (
    <>
      {homeCategoryFiltered.map((category) => (
        <CategoryProductsCarousel
          key={`cat-${category.order}-${category.label}`}
          category={category}
          lang={lang}
          carouselBreakpoint={carouselBreakpoint}
        />
      ))}
    </>
  );
}
