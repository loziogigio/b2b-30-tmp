// components/category/CategoryPage.tsx
'use client';

import React, { useMemo } from 'react';
import Container from '@components/ui/container';
import CategoryBreadcrumb from '@components/ui/category-breadcrumb';
import {
  usePimMenuQuery,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';
import { useTranslation } from 'src/app/i18n/client';
import ProductsCarousel from '@components/product/products-carousel';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import Link from 'next/link';

// Helper to find a node by path in the menu tree
function findNodeByPath(tree: MenuTreeNode[], pathSegments: string[]): MenuTreeNode | null {
  if (!pathSegments.length) return null;
  let current: MenuTreeNode | undefined;
  let children = tree;
  for (const seg of pathSegments) {
    current = children.find((n) => n.slug === seg);
    if (!current) return null;
    children = current.children;
  }
  return current || null;
}

export default function CategoryPage({
  lang,
  slug,
}: {
  lang: string;
  slug: string[];
}) {
  const { t } = useTranslation(lang, 'common');
  const { data, isLoading, isError } = usePimMenuQuery({
    location: 'header',
    staleTime: 5 * 60 * 1000,
  });

  const tree = useMemo(() => data?.menuItems ?? [], [data]);
  const current = useMemo(
    () => (slug.length ? findNodeByPath(tree, slug) : null),
    [tree, slug],
  );

  // Build breadcrumb path nodes
  const pathNodes: MenuTreeNode[] = useMemo(() => {
    if (!current) return [];
    const segs = current.path;
    const crumbs: MenuTreeNode[] = [];
    let level = tree;
    for (const s of segs) {
      const n = level.find((x) => x.slug === s);
      if (!n) break;
      crumbs.push(n);
      level = n.children;
    }
    return crumbs;
  }, [tree, current]);

  // Decide which children to show:
  // - no slug → top-level nodes
  // - non-leaf → its direct children
  // - leaf → redirect to node.url? (for now, show its own products)
  const children = useMemo<MenuTreeNode[]>(() => {
    if (!slug.length) return tree;
    if (current?.children?.length) return current.children;
    return []; // leaf → no children; your rule usually navigates to leaf url from menu
  }, [tree, slug, current]);

  if (isLoading) return null;
  if (isError) {
    return (
      <Container>
        <div className="py-8 text-sm text-gray-500">
          {t('error', { defaultValue: 'Something went wrong.' })}
        </div>
      </Container>
    );
  }

  // Optional: if leaf reached here, you could redirect to current.url instead.
  // For demo, we just show its products.

  return (
    <div className="bg-white">
      <Container className="py-4">
        <CategoryBreadcrumb
          lang={lang}
          categories={pathNodes}
          allLabel={t('all-categories', { defaultValue: 'All Categories' })}
          onAllCategoriesClick={() => {
            /* navigate to /[lang]/category */ window.location.href = `/${lang}/category`;
          }}
          onCategorySelect={(node) => {
            window.location.href = `/${lang}/category/${node.path.join('/')}`;
          }}
        />

        <h1 className="text-xl font-semibold text-gray-900">
          {current
            ? current.label
            : t('all-categories', { defaultValue: 'All Categories' })}
        </h1>
      </Container>

      {/* Render sub-nodes as carousels */}
      <div className="py-4">
        {children.map((child) => (
          <CategoryChildCarousel key={child.id} lang={lang} child={child} />
        ))}

        {/* Leaf fallback (optional) */}
        {!children.length && current && (
          <LeafFallback lang={lang} node={current} />
        )}
      </div>
    </div>
  );
}

function CategoryChildCarousel({
  lang,
  child,
}: {
  lang: string;
  child: MenuTreeNode;
}) {
  // Use the child.slug path, or if your product API needs a code, map slug→code here.
  const codeFromUrl = (() => {
    if (!child.url) return null;
    const qs = child.url.includes('?') ? child.url.split('?')[1] : child.url;
    const sp = new URLSearchParams(qs);
    return sp.get('filters-category') || sp.get('category');
  })();

  const { data, isLoading, error } = useProductListQuery({
    per_page: 10,
    start: 0,
    customer_code: '00000',
    address_code: '',
    // Prefer your filters-category code if it exists; otherwise you may need a slug→code lookup
    search: codeFromUrl
      ? { 'filters-category': codeFromUrl }
      : { category: child.slug },
  });

  if (isLoading || error) return null;

  return (
    <Container className="mb-6">
      <ProductsCarousel
        sectionHeading={child.label}
        categorySlug={`/${lang}/category/${child.path.join('/')}`}
        products={data}
        loading={isLoading}
        limit={10}
        uniqueKey={`cat-child-${child.id}`}
        lang={lang}
        carouselBreakpoint={{}}
      />
      {/* CTA to full child page */}
      <div className="mt-2">
        <Link
          href={`/${lang}/category/${child.path.join('/')}`}
          className="text-sm text-blue-600 hover:underline"
        >
          {`See all in ${child.label}`}
        </Link>
      </div>
    </Container>
  );
}

function LeafFallback({ lang, node }: { lang: string; node: MenuTreeNode }) {
  const codeFromUrl = (() => {
    if (!node.url) return null;
    const qs = node.url.includes('?') ? node.url.split('?')[1] : node.url;
    const sp = new URLSearchParams(qs);
    return sp.get('filters-category') || sp.get('category');
  })();

  const { data, isLoading, error } = useProductListQuery({
    per_page: 10,
    start: 0,
    customer_code: '00000',
    address_code: '',
    search: codeFromUrl
      ? { 'filters-category': codeFromUrl }
      : { category: node.slug },
  });

  if (isLoading || error) return null;

  return (
    <Container className="mb-6">
      <ProductsCarousel
        sectionHeading={node.label}
        categorySlug={`/${lang}/category/${node.path.join('/')}`}
        products={data}
        loading={isLoading}
        limit={10}
        uniqueKey={`cat-leaf-${node.id}`}
        lang={lang}
        carouselBreakpoint={{}}
      />
    </Container>
  );
}
