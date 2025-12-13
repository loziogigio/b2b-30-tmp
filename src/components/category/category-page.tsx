// components/category/CategoryPage.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Container from '@components/ui/container';
import CategoryBreadcrumb from '@components/ui/category-breadcrumb';
import {
  usePimMenuQuery,
  findNodeByPath,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';
import { useTranslation } from 'src/app/i18n/client';
import ProductsCarousel from '@components/product/products-carousel';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import BannerCard from '@components/cards/banner-card';
import CategoryChildrenCarousel from './category-children-carousel';
import CategorySubcategoriesGrid from './category-subcategories-grid';

const NUM_ITEM = 6;
const MAX_ROWS = 5;

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
      (n.category_banner_image ||
        n.category_banner_image_mobile ||
        (n.description && n.description.trim().length > 0)),
  );
}

function pickHeroNode(current: MenuTreeNode | null, pathNodes: MenuTreeNode[]) {
  if (hasHero(current)) return current;
  for (let i = pathNodes.length - 2; i >= 0; i--) {
    if (hasHero(pathNodes[i])) return pathNodes[i];
  }
  return current ?? null;
}

/* =========================
   TOP HERO (banner + description)
   - Uses BannerCard for responsive image
========================= */
function CategoryHero({
  node,
  lang,
}: {
  node: MenuTreeNode | null;
  lang: string;
}) {
  if (!node) return null;

  // helpers — keep in this file or move to a utils module
  function normalizePath(p?: string) {
    if (!p) return '';
    return p.startsWith('/') ? p : `/${p}`;
  }

  function hrefFromNode(node: MenuTreeNode, lang: string) {
    // 1) If CMS already gives a usable url, trust it (and prefix lang if not absolute)
    if (node.url) {
      const isAbsolute = /^https?:\/\//i.test(node.url);
      return isAbsolute ? node.url : `/${lang}${normalizePath(node.url)}`;
    }

    // 2) If we have a path array, join segments
    if (node.path && node.path.length) {
      return `/${lang}/${node.path.map(encodeURIComponent).join('/')}`;
    }

    // 3) Fallback to slug
    if (node.slug) {
      return `/${lang}/${encodeURIComponent(node.slug)}`;
    }

    // 4) Ultimate fallback
    return `/${lang}`;
  }

  const desktopSrc = node.category_banner_image || undefined;
  const mobileSrc =
    node.category_banner_image_mobile ||
    node.category_banner_image ||
    undefined;

  const hasImage = Boolean(desktopSrc || mobileSrc);
  const hasDescription = Boolean(
    node.description && node.description.trim().length > 0,
  );

  if (!hasImage && !hasDescription) return null;

  const banner = hasImage
    ? {
        slug: hrefFromNode(node, lang), // full href ready to use
        title: node.label || node.name || 'Category',
        image: {
          desktop: {
            url: desktopSrc!,
            width: 1920, // fallback if CMS doesn't provide sizes
            height: 480,
          },
          mobile: {
            url: mobileSrc!,
            width: 800,
            height: 600,
          },
        },
      }
    : null;

  return (
    <div className="bg-white">
      <Container className="pt-3">
        {hasImage && banner && (
          <div className="mb-3">
            <BannerCard
              lang={lang}
              banner={banner}
              variant="rounded"
              effectActive
              className="rounded-xl overflow-hidden max-w-full"
              classNameInner="w-full h-auto"
            />
          </div>
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
    [current, pathNodes],
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

  // Handle case when category not found in tree
  if (slug.length && !current && tree.length > 0) {
    return (
      <Container>
        <div className="py-8 text-sm text-gray-500">
          {t('category-not-found', { defaultValue: 'Category not found.' })}
        </div>
      </Container>
    );
  }

  return (
    <div className="bg-white">
      {/* ⬇️ HERO on top (parent if available, else current) */}
      <CategoryHero node={heroNode} lang={lang} />

      {/* Breadcrumbs + title */}
      <Container className="py-2">
        <CategoryBreadcrumb
          lang={lang}
          categories={pathNodes}
          allLabel={t('all-categories', { defaultValue: 'All Categories' })}
          onAllCategoriesClick={() => {
            window.location.href = `/${lang}/category`;
          }}
          onCategorySelect={(node) => {
            window.location.href = `/${lang}/category/${node.path.join('/')}`;
          }}
        />
      </Container>

      {/* Category content */}
      <div className="py-4">
        {(() => {
          // 1) Leaf: show its own carousel and stop
          if (
            slug.length &&
            current &&
            !(current.isGroup && (current.children?.length ?? 0) > 0)
          ) {
            return <CategoryLeafCarousel lang={lang} node={current} />;
          }

          // 2) Check if current node's children are ALL leaves (no subcategories)
          // If so, display them in a grid instead of iterating carousels
          if (current && current.children && current.children.length > 0) {
            const allChildrenAreLeaves = current.children.every(
              (child) => !child.children || child.children.length === 0,
            );

            if (allChildrenAreLeaves) {
              return (
                <Container>
                  <CategorySubcategoriesGrid
                    lang={lang}
                    parentNode={current}
                    subcategories={current.children}
                    showViewAll={false}
                  />
                </Container>
              );
            }
          }

          // 3) Top level or group with children that have subcategories → show carousel for each group
          const source = visibleRows.length ? visibleRows : rows;
          const list = source.length ? source : tree;

          // Determine if we're at LEVEL 0 (top-level, no slug)
          // LEVEL 0: max 4 cards + "Non ti basta?"
          // LEVEL 1+: show ALL children, no "Non ti basta?"
          const isTopLevel = slug.length === 0;

          const sections = list.map((child) => {
            const childHas = (child.children?.length ?? 0) > 0;
            const childIsGroup = child.isGroup && childHas;

            // If child is a group with subcategories, show children category carousel
            if (childIsGroup) {
              return (
                <CategoryChildrenCarousel
                  key={child.id}
                  lang={lang}
                  parentNode={child}
                  isTopLevel={isTopLevel}
                />
              );
            }

            // Otherwise show leaf carousel (products)
            return (
              <CategoryLeafCarousel key={child.id} lang={lang} node={child} />
            );
          });

          return (
            <>
              {sections}
              {totalRows > rowsToShow && (
                <Container>
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setRowsToShow((n) => Math.min(n + MAX_ROWS, totalRows))
                      }
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
   Extract search text from URL-like strings (e.g., "shop?text=luce" -> "luce")
========================= */
function extractSearchText(url: string | undefined, fallback: string): string {
  if (!url) return fallback;
  const qs = url.includes('?') ? url.split('?')[1] : '';
  if (qs) {
    const sp = new URLSearchParams(qs);
    // Check for text param first, then category filters
    const text = sp.get('text') || sp.get('q');
    if (text) return text;
    const category = sp.get('filters-category') || sp.get('category');
    if (category) return category;
  }
  return fallback;
}

/* =========================
   ROW: Leaf (show 1 slider of products)
========================= */
function CategoryLeafCarousel({
  lang,
  node,
}: {
  lang: string;
  node: MenuTreeNode;
}) {
  const searchQuery = extractSearchText(node.url ?? undefined, node.slug);

  const { data, isLoading, error } = usePimProductListQuery({
    limit: NUM_ITEM,
    q: searchQuery,
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
