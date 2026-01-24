// components/category/category-subcategories-grid.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { IoChevronForward } from 'react-icons/io5';
import { useTranslation } from 'src/app/i18n/client';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';
import Heading from '@components/ui/heading';
import { CategoryCard } from './category-children-carousel';

interface ViewAllCardProps {
  lang: string;
  parentHref?: string;
}

function ViewAllCard({ lang, parentHref }: ViewAllCardProps) {
  const { t } = useTranslation(lang, 'common');
  const href = parentHref || `/${lang}/category`;

  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center bg-brand rounded-xl p-6 text-white hover:bg-brand/80 transition-colors min-h-[280px]"
    >
      <h3 className="text-2xl md:text-3xl font-bold text-center mb-2">
        {t('text-not-enough', { defaultValue: 'Non ti basta?' })}
      </h3>
      <p className="text-sm text-white/80 mb-4">
        {t('text-discover-all-categories', {
          defaultValue: 'Scopri tutte le categorie',
        })}
      </p>
      <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
        <IoChevronForward className="w-5 h-5" />
      </div>
    </Link>
  );
}

interface CategorySubcategoriesGridProps {
  lang: string;
  parentNode?: MenuTreeNode | null;
  subcategories: MenuTreeNode[];
  title?: string;
  iconSrc?: string;
  showViewAll?: boolean;
}

export default function CategorySubcategoriesGrid({
  lang,
  parentNode,
  subcategories,
  title,
  iconSrc,
  showViewAll = true,
}: CategorySubcategoriesGridProps) {
  const displayTitle = title || parentNode?.label || parentNode?.name || '';
  const displayIcon = iconSrc || parentNode?.category_menu_image || undefined;

  const parentHref = parentNode
    ? parentNode.url
      ? parentNode.url.startsWith('/')
        ? `/${lang}${parentNode.url}`
        : `/${lang}/${parentNode.url}`
      : `/${lang}/category/${parentNode.path.join('/')}`
    : `/${lang}/category`;

  if (!subcategories.length) return null;

  return (
    <section className="mb-6">
      {/* Header with icon and title - matching carousel style */}
      {displayTitle && (
        <div className="flex items-center gap-3 pb-0.5 mb-5 xl:mb-6">
          {displayIcon && (
            <img
              src={displayIcon}
              alt={displayTitle}
              className="h-20 w-20 rounded object-cover sm:h-30 sm:w-30"
              loading="lazy"
              decoding="async"
            />
          )}
          <Heading variant="heading">{displayTitle}</Heading>
        </div>
      )}

      {/* Grid of subcategory cards - using same CategoryCard as carousel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {subcategories.map((node) => (
          <CategoryCard
            key={node.id}
            node={node}
            lang={lang}
            isTopLevel={false}
          />
        ))}

        {/* View All card */}
        {showViewAll && <ViewAllCard lang={lang} parentHref={parentHref} />}
      </div>
    </section>
  );
}
