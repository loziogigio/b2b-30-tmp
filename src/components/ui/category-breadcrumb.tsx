// components/ui/CategoryBreadcrumb.tsx
'use client';

import React from 'react';
import NextLink from 'next/link';
import { IoChevronForward } from 'react-icons/io5';
import { HiOutlineHome } from 'react-icons/hi';
import { useTranslation } from 'src/app/i18n/client';
import type { MenuTreeNode } from '@utils/transform/b2b-menu-tree';
import {
  categoryDetailHref,
  DEFAULT_CATEGORY_ROOT,
} from '@/lib/seo/category-root';

interface BreadcrumbNavProps {
  lang: string;
  categories: MenuTreeNode[];
  onCategorySelect?: (node: MenuTreeNode) => void;
  onAllCategoriesClick?: () => void;
  allLabel?: string;
  categoryRoot?: string;
}

const PILL_BASE =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium max-w-[18rem] truncate transition-colors';
const PILL_NEUTRAL = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
const PILL_ACTIVE = 'bg-brand text-white cursor-default';

const CategoryBreadcrumb: React.FC<BreadcrumbNavProps> = ({
  lang,
  categories,
  onCategorySelect,
  onAllCategoriesClick,
  allLabel,
  categoryRoot = DEFAULT_CATEGORY_ROOT,
}) => {
  const { t } = useTranslation(lang, 'common');

  const allText =
    allLabel ?? t('all-categories', { defaultValue: 'All Groups' });
  const lastIndex = categories.length - 1;
  const isRoot = categories.length === 0;

  const toCategoryHref = (node?: MenuTreeNode) =>
    categoryDetailHref(lang, node?.path ?? [], categoryRoot);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center mb-3">
      <ol className="flex items-center w-full gap-1.5 overflow-hidden whitespace-nowrap min-w-0">
        {/* 1) Home — always neutral, links to homepage */}
        <li className="shrink-0">
          <NextLink
            href={`/${lang}`}
            aria-label="Home"
            className={`${PILL_BASE} ${PILL_NEUTRAL}`}
          >
            <HiOutlineHome className="text-base" aria-hidden="true" />
          </NextLink>
        </li>

        <li className="shrink-0 text-gray-400" aria-hidden="true">
          <IoChevronForward className="text-base" />
        </li>

        {/* 2) Tutti i gruppi — always present, active when at category root */}
        <li className="shrink-0">
          {isRoot ? (
            <span
              aria-current="page"
              title={allText}
              className={`${PILL_BASE} ${PILL_ACTIVE}`}
            >
              <span suppressHydrationWarning>{allText}</span>
            </span>
          ) : (
            <NextLink
              href={toCategoryHref()}
              className={`${PILL_BASE} ${PILL_NEUTRAL}`}
              onClick={onAllCategoriesClick}
            >
              <span suppressHydrationWarning>{allText}</span>
            </NextLink>
          )}
        </li>

        {/* 3) Path */}
        {categories.map((cat, idx) => {
          const isLast = idx === lastIndex;
          return (
            <React.Fragment key={cat.id ?? idx}>
              <li className="shrink-0 text-gray-400" aria-hidden="true">
                <IoChevronForward className="text-base" />
              </li>

              <li className="min-w-0">
                {isLast ? (
                  <span
                    aria-current="page"
                    title={cat.label}
                    className={`${PILL_BASE} ${PILL_ACTIVE}`}
                  >
                    {cat.label}
                  </span>
                ) : (
                  <NextLink
                    href={toCategoryHref(cat)}
                    title={cat.label}
                    className={`${PILL_BASE} ${PILL_NEUTRAL}`}
                    onClick={() => onCategorySelect?.(cat)}
                  >
                    {cat.label}
                  </NextLink>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default CategoryBreadcrumb;
