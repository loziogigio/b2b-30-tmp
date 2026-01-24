// components/category/category-children-carousel.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IoChevronForward, IoChevronBack } from 'react-icons/io5';
import { useTranslation } from 'src/app/i18n/client';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import Container from '@components/ui/container';
import Heading from '@components/ui/heading';

// Breakpoints for the carousel - show partial item (5.25) to indicate more content
const carouselBreakpoints = {
  '1921': { slidesPerView: 5.25, spaceBetween: 16 },
  '1780': { slidesPerView: 5.25, spaceBetween: 16 },
  '1536': { slidesPerView: 5.25, spaceBetween: 16 },
  '1280': { slidesPerView: 4.25, spaceBetween: 16 },
  '1024': { slidesPerView: 3.25, spaceBetween: 16 },
  '640': { slidesPerView: 2.25, spaceBetween: 12 },
  '360': { slidesPerView: 1.25, spaceBetween: 12 },
  '0': { slidesPerView: 1.25, spaceBetween: 12 },
};

// Build category URL using pre-slugified path from node
function buildCategoryHref(lang: string, node: MenuTreeNode): string {
  if (node.path?.length) {
    // node.path is already slugified from the PIM transformation
    return `/${lang}/category/${node.path.join('/')}`;
  }
  return `/${lang}/category`;
}

/* =========================
   Category Card with Category Icon
   Shows the category's own icon image
========================= */
interface CategoryCardProps {
  node: MenuTreeNode;
  lang: string;
  /** When true (LEVEL 0), always use category path. When false, leaves use search URL */
  isTopLevel?: boolean;
}

export function CategoryCard({
  node,
  lang,
  isTopLevel = false,
}: CategoryCardProps) {
  const { t } = useTranslation(lang, 'common');

  // Use category's own icon image instead of fetching product (avoids rate limiting)
  const categoryImage = node.category_menu_image || null;

  // At LEVEL 0 (isTopLevel): ALWAYS go to category page
  // At LEVEL 1+: Leaf categories → product search, non-leaves → category page
  const categoryPath = buildCategoryHref(lang, node);
  let href = categoryPath;
  let isGoingToSearch = false;

  if (!isTopLevel) {
    const isLeaf = !node.children || node.children.length === 0;
    if (isLeaf && node.url) {
      href = node.url.startsWith('/')
        ? `/${lang}${node.url}`
        : `/${lang}/${node.url}`;
      isGoingToSearch = true;
    }
  }

  // Button label: "vedi prodotti" for search, "visualizza categoria" for category page
  const buttonLabel = isGoingToSearch
    ? t('text-view-products', { defaultValue: 'vedi prodotti' })
    : t('text-view-category', { defaultValue: 'visualizza categoria' });

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-[#EAEEF2] overflow-hidden transition-all duration-300 h-full">
      {/* Image container - matching ProductCardB2B style */}
      <Link href={href} className="relative shrink-0">
        <div className="overflow-hidden mx-auto w-full sm:w-[225px] h-[225px] md:w-[250px] md:h-[250px] transition duration-200 ease-in-out transform group-hover:scale-105 relative cursor-pointer">
          {categoryImage ? (
            <Image
              src={categoryImage}
              alt={node.label || node.name || ''}
              fill
              quality={100}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover bg-fill-thumbnail pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Title */}
      <div className="px-3 pt-3 pb-2 text-center flex-grow">
        <h3 className="font-sans text-sm sm:text-base font-bold text-brand leading-tight tracking-normal text-center">
          {node.label || node.name}
        </h3>
      </div>

      {/* Button - centered, not full width */}
      <div className="flex justify-center px-2 pb-3">
        <Link
          href={href}
          className="inline-flex items-center justify-center px-6 h-10 rounded-md bg-brand text-brand-light text-[10px] sm:text-xs font-medium transition-all hover:bg-brand/90"
        >
          {buttonLabel}
        </Link>
      </div>
    </div>
  );
}

/* =========================
   View All Card
========================= */
interface ViewAllCardProps {
  lang: string;
  parentHref: string;
}

function ViewAllCard({ lang, parentHref }: ViewAllCardProps) {
  const { t } = useTranslation(lang, 'common');

  return (
    <Link
      href={parentHref}
      className="flex flex-col items-center justify-center bg-brand rounded-xl p-4 text-white hover:bg-brand/80 transition-colors h-full min-h-[200px]"
    >
      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-1">
        {t('text-not-enough', { defaultValue: 'Non ti basta?' })}
      </h3>
      <p className="text-[10px] sm:text-xs text-white/80 mb-3 text-center">
        {t('text-discover-all-categories', {
          defaultValue: 'Scopri tutte le categorie',
        })}
      </p>
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white flex items-center justify-center">
        <IoChevronForward className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    </Link>
  );
}

/* =========================
   Main Carousel Component
   Displays children categories in a carousel format
========================= */
interface CategoryChildrenCarouselProps {
  lang: string;
  parentNode: MenuTreeNode;
  /** True when at LEVEL 0 (top-level /category page). Shows max 4 + "Non ti basta?" */
  isTopLevel?: boolean;
}

const MAX_CARDS = 4;

export default function CategoryChildrenCarousel({
  lang,
  parentNode,
  isTopLevel = false,
}: CategoryChildrenCarouselProps) {
  const children = parentNode.children || [];

  if (!children.length) return null;

  // LEVEL 0 (isTopLevel=true): Show max 4 cards + ALWAYS show "Non ti basta?"
  // LEVEL 1+ (isTopLevel=false): Show ALL children, no "Non ti basta?"
  const showNonTiBasta = isTopLevel; // Always show at LEVEL 0
  const displayedChildren = isTopLevel
    ? children.slice(0, MAX_CARDS)
    : children; // Show ALL when inside a category

  // "Non ti basta?" ALWAYS goes to category page, never to search
  const parentHref = buildCategoryHref(lang, parentNode);

  const headerImageSrc = parentNode.category_menu_image || undefined;

  return (
    <Container className="mb-6">
      {/* Section Header with icon and title */}
      <div className="flex items-center gap-3 pb-0.5 mb-5 xl:mb-6">
        {headerImageSrc && (
          <img
            src={headerImageSrc}
            alt={parentNode.label || parentNode.name || ''}
            className="h-20 w-20 rounded object-cover sm:h-30 sm:w-30"
            loading="lazy"
            decoding="async"
          />
        )}
        <Heading variant="heading">
          {parentNode.label || parentNode.name}
        </Heading>
      </div>

      {/* Carousel with custom navigation arrows */}
      <div className="relative category-carousel group">
        {/* Custom Prev Arrow */}
        <button
          className="category-carousel-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shadow-lg hover:bg-brand/80 transition-colors disabled:opacity-30 -ml-3 opacity-0 group-hover:opacity-100"
          aria-label="Previous"
        >
          <IoChevronBack className="w-5 h-5" />
        </button>

        <Swiper
          modules={[Navigation]}
          spaceBetween={16}
          slidesPerView={2}
          navigation={{
            prevEl: '.category-carousel-prev',
            nextEl: '.category-carousel-next',
          }}
          breakpoints={carouselBreakpoints}
          className="!pb-2 !px-2"
        >
          {displayedChildren.map((child) => (
            <SwiperSlide key={child.id} className="h-auto">
              <CategoryCard node={child} lang={lang} isTopLevel={isTopLevel} />
            </SwiperSlide>
          ))}

          {/* View All card shown only when children have subcategories AND more than 4 exist */}
          {showNonTiBasta && (
            <SwiperSlide className="h-auto">
              <ViewAllCard lang={lang} parentHref={parentHref} />
            </SwiperSlide>
          )}
        </Swiper>

        {/* Custom Next Arrow */}
        <button
          className="category-carousel-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shadow-lg hover:bg-brand/80 transition-colors disabled:opacity-30 -mr-3 opacity-0 group-hover:opacity-100"
          aria-label="Next"
        >
          <IoChevronForward className="w-5 h-5" />
        </button>
      </div>
    </Container>
  );
}
