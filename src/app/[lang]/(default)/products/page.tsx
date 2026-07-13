import { Metadata } from 'next';
import { getProductDetailBlocks as getProductDetailBlocksOld } from '@/lib/db/product-templates';
import { getProductDetailBlocks as getProductDetailBlocksNew } from '@/lib/db/product-templates-simple';
import { ProductDetailWithPreview } from '@components/product/ProductDetailWithPreview';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { fetchProductForSeo } from '@/lib/seo/fetch-product';
import ProductsPageContent from './products-page-content';
import { absoluteProductDetailUrl } from '@/lib/seo/product-url';
import { categoryRootForLang, getSeoConfig } from '@/lib/vcs/seo';

// Generate dynamic SEO metadata for product pages (query param version)
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ sku?: string; preview?: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const search = await searchParams;
  const sku = search?.sku;

  // If no SKU, return default metadata for product list page
  if (!sku) {
    const homeSettings = await getServerHomeSettings(lang);
    const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
    return {
      title: `Prodotti | ${brandingTitle}`,
      description: 'Catalogo prodotti',
    };
  }

  const [product, homeSettings] = await Promise.all([
    fetchProductForSeo(sku, lang),
    getServerHomeSettings(lang),
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

  // Product detail canonicals are always flat. A locale-specific slug wins;
  // SKU is the reachable fallback used by the sitemap and slug resolver.
  const productIdentity = { slug: product.slug, sku };
  const canonicalUrl =
    absoluteProductDetailUrl(siteUrl, lang, productIdentity) || siteUrl;

  // Build keywords from brand, SKU, and product name
  const keywords = [
    sku,
    productName,
    product.brand?.label,
    product.brand?.slug,
  ].filter(Boolean);

  const metadata: Metadata = {
    title: `${productName} | ${sku}`,
    description: productDescription,
    keywords: keywords.join(', '),
    alternates: {
      canonical: canonicalUrl,
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
  return metadata;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ sku?: string; preview?: string }>;
}) {
  const { lang } = await params;
  const search = await searchParams;
  const sku = search?.sku;
  const isPreview = search?.preview === 'true';

  // If no SKU query param, show the products list page
  if (!sku) {
    return <ProductsPageContent lang={lang} />;
  }

  // SKU provided via query param - show product detail
  // Try new simplified template matching first (sku/parentSku based)
  const [seoConfig, initialBlocks] = await Promise.all([
    getSeoConfig(),
    getProductDetailBlocksNew(
      sku, // productSku
      sku, // parentSku (fallback to sku for now)
      isPreview,
    ),
  ]);
  let blocks = initialBlocks;

  // If no blocks found with new system, fallback to old system
  if (!blocks || blocks.length === 0) {
    blocks = await getProductDetailBlocksOld(
      sku,
      undefined, // categoryIds
      undefined, // tags
      isPreview,
    );
  }

  // Use ProductDetailWithPreview wrapper to enable live postMessage updates
  return (
    <ProductDetailWithPreview
      lang={lang}
      sku={sku}
      serverBlocks={blocks || []}
      isPreview={isPreview}
      categoryRoot={categoryRootForLang(seoConfig, lang)}
    />
  );
}
