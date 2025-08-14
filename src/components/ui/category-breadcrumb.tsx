// components/ui/CategoryBreadcrumb.tsx
'use client';

import React from 'react';
import NextLink from 'next/link';
import { IoChevronForward } from 'react-icons/io5';
import { MdCategory } from 'react-icons/md';
import { useTranslation } from 'src/app/i18n/client';
import type { MenuTreeNode } from '@utils/transform/b2b-menu-tree';

interface BreadcrumbNavProps {
  lang: string;
  categories: MenuTreeNode[];
  onCategorySelect?: (node: MenuTreeNode) => void;
  onAllCategoriesClick?: () => void;
  allLabel?: string;
}

const CategoryBreadcrumb: React.FC<BreadcrumbNavProps> = ({
  lang,
  categories,
  onCategorySelect,
  onAllCategoriesClick,
  allLabel,
}) => {
  const { t } = useTranslation(lang, 'common');
  const allText = allLabel || t('all-categories', { defaultValue: 'All Categories' });
  const lastIndex = categories.length - 1;

  const toCategoryHref = (node?: MenuTreeNode) =>
    node ? `/${lang}/category/${node.path.join('/')}` : `/${lang}/category`;

  return (
    <div className="flex items-center mb-3">
      <ol className="flex items-center w-full overflow-hidden">
        {/* All Categories */}
        <li className="text-sm px-2.5 ltr:first:pl-0 inline-flex items-center gap-1">
          <NextLink
            href={toCategoryHref()}
            className="text-brand-muted hover:text-brand-dark inline-flex items-center gap-1"
            onClick={onAllCategoriesClick}
          >
            <MdCategory className="text-lg" aria-hidden="true" />
            <span>{allText}</span>
          </NextLink>
        </li>

        {/* Path */}
        {categories.map((cat, idx) => {
          const isLast = idx === lastIndex;
          return (
            <React.Fragment key={`${cat.id}-${idx}`}>
              <li className="text-base text-brand-dark mt-[1px]">
                <IoChevronForward className="text-brand-dark text-opacity-40 text-15px" />
              </li>

              {/* Last crumb: label only (active), others: link */}
              <li className="text-sm px-2.5">
                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-semibold text-brand-dark cursor-default"
                  >
                    {cat.label}
                  </span>
                ) : (
                  <NextLink
                    href={toCategoryHref(cat)}
                    className="text-blue-600 hover:underline"
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
    </div>
  );
};

export default CategoryBreadcrumb;
