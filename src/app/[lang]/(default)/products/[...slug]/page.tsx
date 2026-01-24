import { Metadata } from 'next';
import { getProductDetailBlocks as getProductDetailBlocksOld } from '@/lib/db/product-templates';
import { getProductDetailBlocks as getProductDetailBlocksNew } from '@/lib/db/product-templates-simple';
import { ProductDetailWithPreview } from '@components/product/ProductDetailWithPreview';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';

// Server-side product fetch for SEO metadata
async function fetchProductForSeo(sku: string) {
  const PIM_API_BASE_URL =
    process.env.NEXT_PUBLIC_PIM_API_URL || 'http://localhost:3001';
  const url = `${PIM_API_BASE_URL}/api/search/search`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_ID || '',
        'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET || '',
      },
      body: JSON.stringify({
        lang: 'it',
        text: '',
        rows: 1,
        filters: { sku: [sku] },
      }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.data?.results?.length) return null;

    const product = data.data.results[0];
    // If product has variants, use the first variant
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return { ...product, ...product.variants[0] };
    }
    return product;
  } catch {
    return null;
  }
}

// Generate dynamic SEO metadata for product pages
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string[] }>;
}): Promise<Metadata> {
  const { lang, slug: slugSegments } = await params;
  const sku = Array.isArray(slugSegments)
    ? slugSegments.join('/')
    : slugSegments;

  const [product, homeSettings] = await Promise.all([
    fetchProductForSeo(sku),
    getServerHomeSettings(),
  ]);

  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  const siteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

  // Fallback metadata if product not found
  if (!product) {
    return {
      title: `${sku} | ${brandingTitle}`,
      description: `Prodotto ${sku}`,
    };
  }

  const productName = product.name || sku;
  const productDescription =
    product.short_description ||
    product.description?.replace(/<[^>]*>/g, '').slice(0, 160) ||
    `${productName} - SKU: ${sku}`;

  // Get product image
  const productImage =
    product.cover_image_url ||
    product.image?.original ||
    product.images?.[0]?.url ||
    '';

  // Build canonical URL
  const canonicalUrl = `${siteUrl}/${lang}/products/${sku}`;

  // Build keywords from brand, SKU, and product name
  const keywords = [
    sku,
    productName,
    product.brand?.label,
    product.brand?.slug,
  ].filter(Boolean);

  return {
    title: `${productName} | ${sku}`,
    description: productDescription,
    keywords: keywords.join(', '),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        it: `${siteUrl}/it/products/${sku}`,
        en: `${siteUrl}/en/products/${sku}`,
      },
    },
    openGraph: {
      title: `${productName} - ${sku}`,
      description: productDescription,
      url: canonicalUrl,
      siteName: brandingTitle,
      type: 'website',
      locale: lang === 'it' ? 'it_IT' : 'en_US',
      images: productImage
        ? [
            {
              url: productImage,
              width: 1200,
              height: 1200,
              alt: productName,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${productName} - ${sku}`,
      description: productDescription,
      images: productImage ? [productImage] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<any>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { lang, slug: slugSegments } = await params;
  const search = await searchParams;
  const isPreview = search?.preview === 'true';

  // Join slug segments to handle SKUs with slashes (e.g., po27011/2zc)
  // With catch-all route [...slug], the slug param is an array
  const slug = Array.isArray(slugSegments)
    ? slugSegments.join('/')
    : slugSegments;

  // Try new simplified template matching first (sku/parentSku based)
  // For now, we'll use slug as both sku and parentSku
  // In production, fetch real product data to get the actual parentSku
  let blocks = await getProductDetailBlocksNew(
    slug, // productSku
    slug, // parentSku (fallback to slug for now)
    isPreview,
  );

  // If no blocks found with new system, fallback to old system
  if (!blocks || blocks.length === 0) {
    blocks = await getProductDetailBlocksOld(
      slug,
      undefined, // categoryIds
      undefined, // tags
      isPreview,
    );
  }

  // Use ProductDetailWithPreview wrapper to enable live postMessage updates
  return (
    <ProductDetailWithPreview
      lang={lang}
      sku={slug}
      serverBlocks={blocks || []}
      isPreview={isPreview}
    />
  );
}
