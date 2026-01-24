// app/[lang]/category/[[...slug]]/page.tsx  (Next.js App Router)

import { Metadata } from 'next';
import CategoryPage from '@components/category/category-page';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { slugify } from '@utils/slugify';

// Types for menu tree
interface MenuTreeNode {
  id: string;
  slug: string;
  name: string;
  label: string;
  url: string | null;
  path: string[];
  isGroup: boolean;
  children: MenuTreeNode[];
  category_menu_image?: string | null;
  category_banner_image?: string | null;
  description?: string | null;
}

// Server-side menu fetch for SEO metadata
async function fetchMenuForSeo(): Promise<MenuTreeNode[]> {
  const PIM_API_BASE_URL =
    process.env.NEXT_PUBLIC_PIM_API_URL || 'http://localhost:3001';
  const url = `${PIM_API_BASE_URL}/api/public/menu?location=header`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_ID || '',
        'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET || '',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.success) return [];

    // Transform menu items
    function transformItem(item: any, parentPath: string[] = []): MenuTreeNode {
      const rawSlug = item.reference_id || item.label || item.id;
      const slug = slugify(rawSlug);
      const currentPath = [...parentPath, slug];

      return {
        id: item.id,
        slug,
        name: item.label,
        label: item.label,
        url: item.url || null,
        path: currentPath,
        isGroup: item.children?.length > 0,
        children: (item.children || []).map((child: any) =>
          transformItem(child, currentPath),
        ),
        category_menu_image: item.icon || null,
        category_banner_image: item.image_url || null,
        description: item.rich_text || null,
      };
    }

    return (data.menuItems || []).map((item: any) => transformItem(item, []));
  } catch {
    return [];
  }
}

// Find node by path
function findNodeByPath(
  tree: MenuTreeNode[],
  pathSegments: string[],
): MenuTreeNode | null {
  if (!pathSegments.length) return null;

  let current: MenuTreeNode | undefined;
  let level = tree;

  for (const segment of pathSegments) {
    current = level.find((node) => node.slug === segment);
    if (!current) return null;
    level = current.children;
  }

  return current || null;
}

// Generate dynamic SEO metadata for category pages
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { lang, slug = [] } = await params;

  const [menuTree, homeSettings] = await Promise.all([
    fetchMenuForSeo(),
    getServerHomeSettings(),
  ]);

  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  const siteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

  // If no slug, show all categories page
  if (!slug.length) {
    const title = lang === 'it' ? 'Tutte le categorie' : 'All Categories';
    const description =
      lang === 'it'
        ? 'Esplora tutte le categorie di prodotti'
        : 'Explore all product categories';
    const canonicalUrl = `${siteUrl}/${lang}/category`;

    return {
      title: `${title} | ${brandingTitle}`,
      description,
      alternates: {
        canonical: canonicalUrl,
        languages: {
          it: `${siteUrl}/it/category`,
          en: `${siteUrl}/en/category`,
        },
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: brandingTitle,
        type: 'website',
        locale: lang === 'it' ? 'it_IT' : 'en_US',
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  // Find specific category
  const category = findNodeByPath(menuTree, slug);

  if (!category) {
    return {
      title: `Categoria | ${brandingTitle}`,
      description: 'Categoria di prodotti',
    };
  }

  const categoryName = category.label || category.name;
  const categoryDescription =
    category.description?.replace(/<[^>]*>/g, '').slice(0, 160) ||
    (lang === 'it'
      ? `Scopri i prodotti della categoria ${categoryName}`
      : `Discover products in ${categoryName} category`);

  // Build canonical URL with full path
  const canonicalUrl = `${siteUrl}/${lang}/category/${slug.join('/')}`;

  // Get category image
  const categoryImage = category.category_banner_image || '';

  // Build breadcrumb for keywords
  const keywords = [categoryName, ...slug].filter(Boolean);

  return {
    title: `${categoryName} | ${brandingTitle}`,
    description: categoryDescription,
    keywords: keywords.join(', '),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        it: `${siteUrl}/it/category/${slug.join('/')}`,
        en: `${siteUrl}/en/category/${slug.join('/')}`,
      },
    },
    openGraph: {
      title: categoryName,
      description: categoryDescription,
      url: canonicalUrl,
      siteName: brandingTitle,
      type: 'website',
      locale: lang === 'it' ? 'it_IT' : 'en_US',
      images: categoryImage
        ? [
            {
              url: categoryImage,
              width: 1200,
              height: 630,
              alt: categoryName,
            },
          ]
        : [],
    },
    twitter: {
      card: categoryImage ? 'summary_large_image' : 'summary',
      title: categoryName,
      description: categoryDescription,
      images: categoryImage ? [categoryImage] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { lang, slug } = await params;
  return <CategoryPage lang={lang} slug={slug ?? []} />;
}
