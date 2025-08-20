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

  // Prefer receiving allLabel from server to avoid any chance of late i18n mismatch.
  // Fallback is still fine in most setups; add suppressHydrationWarning just in case.
  const allText = allLabel ?? t('all-categories', { defaultValue: 'All Categories' });
  const lastIndex = categories.length - 1;

  const toCategoryHref = (node?: MenuTreeNode) =>
    node ? `/${lang}/category/${node.path.join('/')}` : `/${lang}/category`;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center mb-3">
      <ol className="flex items-center w-full overflow-hidden whitespace-nowrap min-w-0">
        {/* All Categories */}
        <li className="text-sm px-2.5 ltr:first:pl-0 inline-flex items-center gap-1 shrink-0">
          <NextLink
            href={toCategoryHref()}
            className="text-brand-muted hover:text-brand-dark inline-flex items-center gap-1"
            onClick={onAllCategoriesClick}
          >
            <MdCategory className="text-lg" aria-hidden="true" />
            <span suppressHydrationWarning>{allText}</span>
          </NextLink>
        </li>

        {/* Path */}
        {categories.map((cat, idx) => {
          const isLast = idx === lastIndex;
          return (
            <React.Fragment key={cat.id ?? idx}>
              <li className="text-base text-brand-dark mt-[1px] shrink-0">
                <IoChevronForward className="text-brand-dark/40 text-15px" />
              </li>

              <li className="text-sm px-2.5 min-w-0">
                {isLast ? (
                  <span
                    aria-current="page"
                    title={cat.label}
                    className="font-semibold text-brand-dark cursor-default block truncate"
                  >
                    {cat.label}
                  </span>
                ) : (
                  <NextLink
                    href={toCategoryHref(cat)}
                    className="text-blue-600 hover:underline block truncate"
                    title={cat.label}
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
