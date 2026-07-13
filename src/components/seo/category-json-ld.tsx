import type { MenuTreeNode } from '@framework/product/get-pim-menu';
import {
  categoryDetailHref,
  DEFAULT_CATEGORY_ROOT,
} from '@/lib/seo/category-root';

interface CategoryJsonLdProps {
  /** The matched category node (the breadcrumb leaf), or null on the "all categories" root page. */
  category: MenuTreeNode | null;
  /** Root → leaf ancestry of `category` (inclusive of `category`). Empty when `category` is null. */
  ancestry: MenuTreeNode[];
  lang: string;
  /** Brand/site name, used for `CollectionPage.name` on the root page and `isPartOf`. */
  siteName?: string;
  /** Label for the "all categories" root crumb / page. */
  rootLabel: string;
  /** Public per-tenant category route segment. */
  categoryRoot?: string;
  /** Canonical storefront origin supplied by the portal SEO configuration. */
  siteUrl?: string;
}

function categoryUrl(
  siteUrl: string,
  lang: string,
  path: string[] | null,
  categoryRoot: string,
): string {
  return `${siteUrl}${categoryDetailHref(lang, path ?? [], categoryRoot)}`;
}

/**
 * Server-rendered `BreadcrumbList` + `CollectionPage` JSON-LD for category pages.
 * (Renders nothing if `NEXT_PUBLIC_WEBSITE_URL` is unset — absolute URLs are required.)
 */
export default function CategoryJsonLd({
  category,
  ancestry,
  lang,
  siteName,
  rootLabel,
  categoryRoot = DEFAULT_CATEGORY_ROOT,
  siteUrl: configuredSiteUrl,
}: CategoryJsonLdProps) {
  const siteUrl = (configuredSiteUrl || process.env.NEXT_PUBLIC_WEBSITE_URL || '').replace(
    /\/$/,
    '',
  );
  if (!siteUrl) return null;

  const homeUrl = `${siteUrl}/${lang}`;
  const rootUrl = categoryUrl(siteUrl, lang, null, categoryRoot);

  const name = category
    ? category.label || category.name
    : siteName || rootLabel;
  const url = category
    ? categoryUrl(siteUrl, lang, category.path, categoryRoot)
    : rootUrl;
  const description =
    category?.description
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200) || undefined;

  const image =
    category?.category_banner_image ||
    category?.category_menu_image ||
    undefined;

  const crumbs: { name: string; url: string }[] = [
    { name: 'Home', url: homeUrl },
  ];
  if (category) {
    crumbs.push({ name: rootLabel, url: rootUrl });
    for (const node of ancestry) {
      crumbs.push({
        name: node.label || node.name,
        url: categoryUrl(siteUrl, lang, node.path, categoryRoot),
      });
    }
  } else {
    crumbs.push({ name: rootLabel, url: rootUrl });
  }

  // Non-leaf categories surface their subcategories via `hasPart`. This lets
  // Google understand the taxonomy of a parent page even before crawling its
  // children, and is how knowledge-panel-style category hierarchies get built.
  const subcategories = category?.children ?? [];
  const hasPart =
    subcategories.length > 0
      ? subcategories.map((child) => ({
          '@type': 'CollectionPage',
          name: child.label || child.name,
          url: categoryUrl(siteUrl, lang, child.path, categoryRoot),
        }))
      : undefined;

  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      url,
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
      ...(hasPart ? { hasPart } : {}),
      isPartOf: {
        '@type': 'WebSite',
        url: homeUrl,
        name: siteName || rootLabel,
      },
      inLanguage: lang === 'it' ? 'it-IT' : 'en-US',
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
