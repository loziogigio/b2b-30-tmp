// components/category/CategoryPage.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Container from '@components/ui/container';
import CategoryBreadcrumb from '@components/ui/category-breadcrumb';
import { useCmsB2BMenuRawQuery } from '@framework/product/get-b2b-cms';
import { buildB2BMenuTree, findNodeByPath, type MenuTreeNode } from '@utils/transform/b2b-menu-tree';
import { useTranslation } from 'src/app/i18n/client';
import ProductsCarousel from '@components/product/products-carousel';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import { ERP_STATIC } from '@framework/utils/static';

const NUM_ITEM = 6;      // products per carousel
const MAX_ROWS = 5;      // max category rows initially

const breakpoints = {
  '1921': { slidesPerView: 6 },
  '1780': { slidesPerView: 6 },
  '1536': { slidesPerView: 5 },
  '1280': { slidesPerView: 5 },
  '1024': { slidesPerView: 4 },
  '640': { slidesPerView: 3 },
  '360': { slidesPerView: 2 },
  '0': { slidesPerView: 1 },
};

function hasHero(n?: MenuTreeNode | null) {
  return Boolean(
    n &&
    (
      n.category_banner_image ||
      n.category_banner_image_mobile ||
      (n.description && n.description.trim().length > 0)
    )
  );
}

function pickHeroNode(current: MenuTreeNode | null, pathNodes: MenuTreeNode[]) {
  // 1) Prefer current if it has any hero content
  if (hasHero(current)) return current;

  // 2) Otherwise walk up ancestors (from parent → root)
  for (let i = pathNodes.length - 2; i >= 0; i--) {
    if (hasHero(pathNodes[i])) return pathNodes[i];
  }

  // 3) Fallback to current (even if empty) or null
  return current ?? null;
}


/* =========================
   TOP HERO (banner + description)
   - Uses parent node if available, else current
   - Responsive: mobile banner on small screens
========================= */
function CategoryHero({ node }: { node: MenuTreeNode | null }) {
  if (!node) return null;

  const desktopSrc = node.category_banner_image || undefined;
  const mobileSrc = node.category_banner_image_mobile || node.category_banner_image || undefined;
  const hasImage = Boolean(desktopSrc || mobileSrc);
  const hasDescription = Boolean(node.description && node.description.trim().length > 0);

  if (!hasImage && !hasDescription) return null;

  return (
    <div className="bg-white">
      <Container className="pt-3">
        {hasImage && (
          <figure className="mb-3 overflow-hidden rounded-xl border border-border-base">
            <picture>
              {mobileSrc && <source media="(max-width: 640px)" srcSet={mobileSrc} />}
              <img
                src={desktopSrc || mobileSrc!}
                alt={node.label || 'Category banner'}
                className="h-40 w-full object-cover sm:h-56 md:h-64"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <figcaption className="sr-only">{node.label}</figcaption>
          </figure>
        )}

        {hasDescription && (
          <div
            className="prose prose-sm max-w-none text-brand-muted"
            dangerouslySetInnerHTML={{ __html: node.description! }}
          />
        )}
      </Container>
    </div>
  );
}

export default function CategoryPage({ lang, slug }: { lang: string; slug: string[] }) {
  const { t } = useTranslation(lang, 'common');
  const { data, isLoading, isError } = useCmsB2BMenuRawQuery({ staleTime: 5 * 60 * 1000 });

  const tree = useMemo(() => buildB2BMenuTree(data ?? []), [data]);
  const current = useMemo(() => (slug.length ? findNodeByPath(tree, slug) : null), [tree, slug]);

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

  // Decide which collection of nodes we’ll render as rows
  const rows: MenuTreeNode[] = useMemo(() => {
    if (!slug.length) return tree; // top level
    const hasChildren = (current?.children?.length ?? 0) > 0;
    const isGroup = current?.isGroup && hasChildren;
    return isGroup ? current!.children : []; // leaf handled separately
  }, [tree, slug, current]);

  // Parent for hero (fallback to current)
  const heroNode: MenuTreeNode | null = useMemo(
    () => pickHeroNode(current, pathNodes),
    [current, pathNodes]
  );

  const [rowsToShow, setRowsToShow] = useState(MAX_ROWS);
  const totalRows = rows.length;
  const visibleRows = rows.slice(0, rowsToShow);

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

  return (
    <div className="bg-white">
      {/* ⬇️ HERO on top (parent if available, else current) */}
      <CategoryHero node={heroNode} />

      {/* Breadcrumbs + title */}
      <Container className="py-2">
        <CategoryBreadcrumb
          lang={lang}
          categories={pathNodes}
          allLabel={t('all-categories', { defaultValue: 'All Categories' })}
          onAllCategoriesClick={() => { window.location.href = `/${lang}/category`; }}
          onCategorySelect={(node) => { window.location.href = `/${lang}/category/${node.path.join('/')}`; }}
        />
      </Container>

      {/* Rows (category carousels) */}
      <div className="py-4">
        {(() => {
          // 1) Leaf: show its own carousel and stop
          if (slug.length && current && !(current.isGroup && (current.children?.length ?? 0) > 0)) {
            return <CategoryLeafCarousel lang={lang} node={current} />;
          }

          // 2) Top level or non-leaf group → rows with cap + show more
          const source = visibleRows.length ? visibleRows : rows;
          const list = source.length ? source : tree;

          const grid = list.map((child) => {
            const childHas = (child.children?.length ?? 0) > 0;
            const childIsGroup = child.isGroup && childHas;
            return childIsGroup ? (
              <CategoryChildCarousel key={child.id} lang={lang} child={child} />
            ) : (
              <CategoryLeafCarousel key={child.id} lang={lang} node={child} />
            );
          });

          return (
            <>
              {grid}
              {totalRows > rowsToShow && (
                <Container>
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setRowsToShow((n) => Math.min(n + MAX_ROWS, totalRows))}
                      className="rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      {t('show-more', { defaultValue: 'Show more' })}
                    </button>
                  </div>
                </Container>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* =========================
   ROW: Child is a group (non-leaf)
========================= */
function CategoryChildCarousel({ lang, child }: { lang: string; child: MenuTreeNode }) {
  const codeFromUrl = (() => {
    if (!child.url) return null;
    const qs = child.url.includes('?') ? child.url.split('?')[1] : child.url;
    const sp = new URLSearchParams(qs);
    return sp.get('filters-category') || sp.get('category');
  })();

  const { data, isLoading, error } = useProductListQuery({
    per_page: NUM_ITEM,
    start: 0,
    ...ERP_STATIC,
    search: codeFromUrl ? { 'filters-category': codeFromUrl } : { category: child.slug },
  });

  if (isLoading || error) return null;

  // small icon before title inside the carousel header
  const imgSrc = child.category_menu_image || undefined;

  return (
    <Container className="mb-6">
      <ProductsCarousel
        sectionHeading={child.label}
        categorySlug={`category/${child.path.join('/')}`}
        products={data}
        loading={isLoading}
        limit={NUM_ITEM}
        uniqueKey={`cat-child-${child.id}`}
        lang={lang}
        carouselBreakpoint={breakpoints}
        headerImageSrc={imgSrc}        // small square before title
        headerImageAlt={child.label}
      />
    </Container>
  );
}

/* =========================
   ROW: Leaf (show 1 slider of products)
========================= */
function CategoryLeafCarousel({ lang, node }: { lang: string; node: MenuTreeNode }) {
  const codeFromUrl = (() => {
    if (!node.url) return null;
    const qs = node.url.includes('?') ? node.url.split('?')[1] : node.url;
    const sp = new URLSearchParams(qs);
    return sp.get('filters-category') || sp.get('category');
  })();

  const { data, isLoading, error } = useProductListQuery({
    per_page: NUM_ITEM,
    start: 0,
    customer_code: '00000',
    address_code: '',
    search: codeFromUrl ? { 'filters-category': codeFromUrl } : { category: node.slug },
  });

  if (isLoading || error) return null;

  const safeUrl = node.url
    ? (() => {
      const raw = node.url.startsWith('/') ? node.url : `/${node.url}`;
      return raw;
    })()
    : `category/${node.path.join('/')}`;

  return (
    <Container className="mb-6">
      <ProductsCarousel
        sectionHeading={node.label}
        categorySlug={safeUrl}
        products={data}
        loading={isLoading}
        limit={NUM_ITEM}
        uniqueKey={`cat-leaf-${node.id}`}
        lang={lang}
        carouselBreakpoint={breakpoints}
        headerImageSrc={node.category_menu_image || undefined} // small square before title
        headerImageAlt={node.label}
      />
    </Container>
  );
}
