import type { MenuTreeNode } from '@framework/product/get-pim-menu';

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
}

function categoryUrl(
  siteUrl: string,
  lang: string,
  path: string[] | null,
): string {
  const suffix =
    path && path.length ? `/${path.map(encodeURIComponent).join('/')}` : '';
  return `${siteUrl}/${lang}/category${suffix}`;
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
}: CategoryJsonLdProps) {
  const siteUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL || '').replace(
    /\/$/,
    '',
  );
  if (!siteUrl) return null;

  const homeUrl = `${siteUrl}/${lang}`;
  const rootUrl = categoryUrl(siteUrl, lang, null);

  const name = category
    ? category.label || category.name
    : siteName || rootLabel;
  const url = category ? categoryUrl(siteUrl, lang, category.path) : rootUrl;
  const description =
    category?.description
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200) || undefined;

  const crumbs: { name: string; url: string }[] = [
    { name: 'Home', url: homeUrl },
  ];
  if (category) {
    crumbs.push({ name: rootLabel, url: rootUrl });
    for (const node of ancestry) {
      crumbs.push({
        name: node.label || node.name,
        url: categoryUrl(siteUrl, lang, node.path),
      });
    }
  } else {
    crumbs.push({ name: rootLabel, url: rootUrl });
  }

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
      isPartOf: { '@type': 'WebSite', url: homeUrl },
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
