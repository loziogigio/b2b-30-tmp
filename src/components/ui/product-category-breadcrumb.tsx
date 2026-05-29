'use client';

import React, { useMemo } from 'react';
import NextLink from 'next/link';
import { IoChevronForward } from 'react-icons/io5';
import { HiOutlineHome } from 'react-icons/hi';
import {
  usePimMenuQuery,
  findDeepestNodeForCategoryIds,
  buildNodeAncestry,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import { useTranslation } from 'src/app/i18n/client';
import { useThemeId } from '@/contexts/tenant.context';

interface Props {
  lang: string;
  sku: string;
}

// Default (pill) styling used by most themes.
const PILL_BASE =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium max-w-[18rem] truncate transition-colors';
const PILL_NEUTRAL = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
const PILL_ACTIVE = 'bg-brand text-white cursor-default';

// Time theme: lean, text-only crumbs — lighter weight, no pill chrome.
const TIME_BASE =
  'inline-flex items-center gap-1.5 text-[13px] font-normal max-w-[18rem] truncate transition-colors font-[family-name:var(--font-body)]';
const TIME_NEUTRAL =
  'text-[var(--time-gray-500)] hover:text-[var(--time-dark)]';
const TIME_ACTIVE = 'text-[var(--time-dark)] font-medium cursor-default';

export default function ProductCategoryBreadcrumb({ lang, sku }: Props) {
  const { t } = useTranslation(lang, 'common');
  const allLabel = t('all-categories', { defaultValue: 'Tutti i gruppi' });
  const isTime = useThemeId() === 'time';

  const base = isTime ? TIME_BASE : PILL_BASE;
  const neutral = isTime ? TIME_NEUTRAL : PILL_NEUTRAL;
  const active = isTime ? TIME_ACTIVE : PILL_ACTIVE;
  const iconSize = isTime ? 'text-sm' : 'text-base';
  const sepClass = isTime ? 'text-[var(--time-gray-300)]' : 'text-gray-400';

  const { data: menu } = usePimMenuQuery({
    location: 'header',
    staleTime: 5 * 60 * 1000,
  });

  const { data: pimResults = [] } = usePimProductListQuery(
    { limit: 1, filters: { sku: [sku] }, group_variants: true },
    { enabled: !!sku },
  );
  const product: any = pimResults[0];

  const tree: MenuTreeNode[] = useMemo(() => menu?.menuItems ?? [], [menu]);
  const productName: string = product?.name || sku;
  const categoryIds: string[] = useMemo(
    () =>
      Array.isArray(product?.category_ancestors)
        ? (product.category_ancestors as string[])
        : [],
    [product],
  );

  const crumbs: MenuTreeNode[] = useMemo(() => {
    if (!tree.length || !categoryIds.length) return [];
    const deepest = findDeepestNodeForCategoryIds(tree, categoryIds);
    if (!deepest) return [];
    return buildNodeAncestry(tree, deepest);
  }, [tree, categoryIds]);

  const toCategoryHref = (node: MenuTreeNode) =>
    `/${lang}/categorie/${node.path.join('/')}`;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center mb-3">
      <ol className="flex items-center w-full gap-1.5 overflow-hidden whitespace-nowrap min-w-0">
        <li className="shrink-0">
          <NextLink
            href={`/${lang}`}
            aria-label="Home"
            className={`${base} ${neutral}`}
          >
            <HiOutlineHome className={iconSize} aria-hidden="true" />
          </NextLink>
        </li>

        <li className={`shrink-0 ${sepClass}`} aria-hidden="true">
          <IoChevronForward className={iconSize} />
        </li>

        <li className="shrink-0">
          <NextLink
            href={`/${lang}/categorie`}
            title={allLabel}
            className={`${base} ${neutral}`}
          >
            <span suppressHydrationWarning>{allLabel}</span>
          </NextLink>
        </li>

        {crumbs.map((cat) => (
          <React.Fragment key={cat.id}>
            <li className={`shrink-0 ${sepClass}`} aria-hidden="true">
              <IoChevronForward className={iconSize} />
            </li>
            <li className="min-w-0">
              <NextLink
                href={toCategoryHref(cat)}
                title={cat.label}
                className={`${base} ${neutral}`}
              >
                {cat.label}
              </NextLink>
            </li>
          </React.Fragment>
        ))}

        <li className={`shrink-0 ${sepClass}`} aria-hidden="true">
          <IoChevronForward className={iconSize} />
        </li>
        <li className="min-w-0">
          <span
            aria-current="page"
            title={productName}
            className={`${base} ${active}`}
          >
            {productName}
          </span>
        </li>
      </ol>
    </nav>
  );
}
