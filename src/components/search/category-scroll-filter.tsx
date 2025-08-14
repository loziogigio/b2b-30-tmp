'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Carousel from '@components/ui/carousel/carousel';
import { SwiperSlide } from 'swiper/react';
import {
  buildB2BMenuTree,
  type MenuTreeNode,
  findNodeByCode,
} from '@utils/transform/b2b-menu-tree';
import { useCmsB2BMenuRawQuery } from '@framework/product/get-b2b-cms';
import CategoryBreadcrumb from '@components/ui/category-breadcrumb';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Swiper as SwiperType } from 'swiper';

const GAP = 10;

const CategoryScrollFilter: React.FC<{ lang: string }> = ({ lang }) => {
  const { data, isLoading, isError } = useCmsB2BMenuRawQuery({
    staleTime: 5 * 60 * 1000,
  });
  const [path, setPath] = useState<MenuTreeNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const swiperRef = useRef<SwiperType | null>(null);

  // hooks must always run, even while loading:
  const tree = useMemo(() => buildB2BMenuTree(data ?? []), [data]);

  useEffect(() => {
    if (!searchParams) return;
    const code =
      searchParams.get('filters-category') || searchParams.get('category');
    if (!code) return;

    const { node, chain } = findNodeByCode(tree, code);
    if (!node) return;

    setActiveId(node.id);

    const hasChildren = (node.children?.length ?? 0) > 0;
    const isGroup = node.isGroup && hasChildren;
    const parentPath = isGroup ? chain : chain.slice(0, -1);
    setPath(parentPath);
  }, [searchParams, tree]);

  // derive current level safely (empty arrays during loading are fine)
  const currentLevel = useMemo<MenuTreeNode[]>(
    () => (path.length === 0 ? tree : path[path.length - 1]?.children ?? []),
    [tree, path]
  );

  const toCategoryUrl = (node: MenuTreeNode) =>
    `/${lang}/category/${node.path.join('/')}`;

  const toLeafSearchUrl = (node: MenuTreeNode) => {
    if (!node.url) return toCategoryUrl(node);
    const raw = node.url.startsWith('/') ? node.url : `/${node.url}`;
    return raw.startsWith(`/${lang}/`) ? raw : `/${lang}${raw}`;
  };

  const handleCategoryClick = (category: MenuTreeNode) => {
    const hasChildren = (category.children?.length ?? 0) > 0;
    const isGroup = category.isGroup && hasChildren;
    router.push(isGroup ? toCategoryUrl(category) : toLeafSearchUrl(category));
  };

  // also always run these hooks; they are safe on empty data
  const activeIndex = useMemo(
    () => currentLevel.findIndex((x) => x.id === activeId),
    [currentLevel, activeId]
  );

  useEffect(() => {
    if (swiperRef.current && activeIndex >= 0) {
      swiperRef.current.slideTo(activeIndex, 0); // set 300 for animation
    }
  }, [activeIndex]);

  // now it's safe to early-return
  if (isLoading || isError) return null;

  return (
    <div className="relative  py-3 bg-white">
      <CategoryBreadcrumb
        lang={lang}
        categories={path}
        allLabel="All Categories"
        onAllCategoriesClick={() => router.push(`/${lang}/category`)}
        onCategorySelect={(node) => router.push(toCategoryUrl(node))}
      />

      <Carousel
        lang={lang}
        navigation
        autoplay={false}
        slidesPerView="auto"
        spaceBetween={GAP}
        slidesOffsetBefore={GAP}
        slidesOffsetAfter={GAP}
        grabCursor
        buttonSize="small"
        prevActivateId="category-carousel-prev"
        nextActivateId="category-carousel-next"
        initialSlide={Math.max(activeIndex, 0)}
        onSwiper={(s) => (swiperRef.current = s)}
      >
        {currentLevel.map((cat) => {
          const isActive = cat.id === activeId;
          const href =
            cat.isGroup && cat.children.length > 0
              ? toCategoryUrl(cat)
              : toLeafSearchUrl(cat);

          return (
            <SwiperSlide key={cat.id} className="!w-auto">
              <Link
                href={href}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                title={cat.label}
                onClick={() => setActiveId(cat.id)}
              >
                {cat.label}
              </Link>
            </SwiperSlide>
          );
        })}
      </Carousel>
    </div>
  );
};

export default CategoryScrollFilter;
