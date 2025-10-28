'use client';

import { HomeCategory } from '@utils/transform/b2b-cms-home';
import CategoryProductsCarousel from '@components/product/category-products-carousel';
import LikedProductsProductsCarousel from '@components/product/feeds/liked-products-products-carousel';
import TrendingProductsCarousel from '@components/product/feeds/trending-products-carousel';
import Container from '@components/ui/container';
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
  const carouselSpacing = 'mb-12 xl:mb-14 pt-1';

  return (
    <>
      {/* Liked products block */}
      <Container className={carouselSpacing}>
        <LikedProductsProductsCarousel
          lang={lang}
          carouselBreakpoint={carouselBreakpoint}
        />
      </Container>

      {homeCategoryFiltered.map((category) => (
        <CategoryProductsCarousel
          key={`cat-${category.order}-${category.label}`}
          category={category}
          lang={lang}
          carouselBreakpoint={carouselBreakpoint}
        />
      ))}

      {/* Trending products block (always fetched) */}
      <Container className={carouselSpacing}>
        <TrendingProductsCarousel
          lang={lang}
          carouselBreakpoint={carouselBreakpoint}
        />
      </Container>
    </>
  );
}
