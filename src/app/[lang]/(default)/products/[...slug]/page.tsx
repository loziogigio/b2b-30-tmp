import { Metadata } from 'next';
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from '@tanstack/react-query';
import { getProductDetailBlocks as getProductDetailBlocksOld } from '@/lib/db/product-templates';
import { getProductDetailBlocks as getProductDetailBlocksNew } from '@/lib/db/product-templates-simple';
import { ProductDetailWithPreview } from '@components/product/ProductDetailWithPreview';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { fetchProductForSeo } from '@/lib/seo/fetch-product';
import { serverFetchPimProducts } from '@/lib/pim/server-fetch';
import { transformPimProducts } from '@framework/product/get-pim-product';

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
    fetchProductForSeo(sku, lang),
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
  const slug = Array.isArray(slugSegments)
    ? slugSegments.join('/')
    : slugSegments;

  // Fetch blocks and prefetch product data in parallel
  const queryClient = new QueryClient();

  // Query params matching what usePimProductListQuery uses in product-b2b-details.tsx
  const productQueryParams = {
    limit: 1,
    filters: { sku: [slug] },
    group_variants: true,
  };

  const [blocks, product] = await Promise.all([
    // Fetch page layout blocks
    (async () => {
      let b = await getProductDetailBlocksNew(slug, slug, isPreview);
      if (!b || b.length === 0) {
        b = await getProductDetailBlocksOld(
          slug,
          undefined,
          undefined,
          isPreview,
        );
      }
      return b;
    })(),
    // Fetch product for JSON-LD
    fetchProductForSeo(slug, lang),
    // Prefetch product data into React Query cache
    queryClient.prefetchQuery({
      queryKey: ['pim-search', productQueryParams],
      queryFn: async () => {
        const result = await serverFetchPimProducts({
          lang,
          rows: 1,
          filters: { sku: [slug] },
          group_variants: true,
        });
        return transformPimProducts(result.results).map((p) => ({
          ...p,
          variantCount: p.variations?.length || 1,
        }));
      },
    }),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

  return (
    <>
      {/* Product JSON-LD structured data for Google */}
      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name || slug,
              description: (
                product.short_description ||
                product.description?.replace(/<[^>]*>/g, '') ||
                ''
              ).slice(0, 500),
              sku: slug,
              image:
                product.cover_image_url ||
                product.images?.[0]?.url ||
                undefined,
              brand: product.brand
                ? { '@type': 'Brand', name: product.brand.label }
                : undefined,
              url: `${siteUrl}/${lang}/products/${slug}`,
            }),
          }}
        />
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProductDetailWithPreview
          lang={lang}
          sku={slug}
          serverBlocks={blocks || []}
          isPreview={isPreview}
        />
      </HydrationBoundary>
    </>
  );
}
