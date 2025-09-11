'use client';

import { HomeCategory } from '@utils/transform/b2b-cms-home';
import CategoryProductsCarousel from '@components/product/category-products-carousel';
import LikedProductsProductsCarousel from '@components/product/feeds/liked-products-products-carousel';
import TrendingProductsCarousel from '@components/product/feeds/trending-products-carousel';
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
      {/* Liked products block */}
      <LikedProductsProductsCarousel lang={lang} carouselBreakpoint={carouselBreakpoint} />

      {homeCategoryFiltered.map((category) => (
        <CategoryProductsCarousel
          key={`cat-${category.order}-${category.label}`}
          category={category}
          lang={lang}
          carouselBreakpoint={carouselBreakpoint}
        />
      ))}

      {/* Trending products block (always fetched) */}
      <TrendingProductsCarousel lang={lang} carouselBreakpoint={carouselBreakpoint} />
    </>
  );
}
