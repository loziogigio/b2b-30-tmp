import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from '@tanstack/react-query';
import { getCachedCmsPage } from '@/lib/db/cms-pages';
import { CmsPageRenderer } from '@/components/blocks/CmsPageRenderer';
import { getProductDetailBlocks as getProductDetailBlocksOld } from '@/lib/db/product-templates';
import { getProductDetailBlocks as getProductDetailBlocksNew } from '@/lib/db/product-templates-simple';
import { ProductDetailWithPreview } from '@components/product/ProductDetailWithPreview';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { fetchProductForSeo } from '@/lib/seo/fetch-product';
import { serverFetchPimProducts } from '@/lib/pim/server-fetch';
import { transformPimProducts } from '@framework/product/get-pim-product';
import { resolveProduct, type ResolvedProduct } from '@/lib/vcs/seo';
import { AUTH_COOKIES } from '@/lib/auth/cookies';

interface RouteParams {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { lang, slug } = await params;

  // 1) CMS page wins on a single-segment collision (spec D3 / open item).
  const page = await getCachedCmsPage(slug, lang);
  if (page) {
    const seo = (page.seo ?? {}) as {
      title?: string;
      description?: string;
      og_image?: string;
    };
    return {
      title: seo.title || page.name,
      description: seo.description,
      openGraph: seo.og_image ? { images: [seo.og_image] } : undefined,
    };
  }

  // 2) Else try to resolve the slug to a product via vcs.
  const resolved = await resolveProduct(slug, lang);
  if (!resolved) return {};

  return productMetadata(resolved, slug, lang);
}

/** Build product detail metadata for a flat-slug product page (canonical = flat slug, D4). */
async function productMetadata(
  resolved: ResolvedProduct,
  slug: string,
  lang: string,
): Promise<Metadata> {
  const sku = resolved.sku;
  const [product, homeSettings] = await Promise.all([
    fetchProductForSeo(sku, lang),
    getServerHomeSettings(lang),
  ]);

  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  const siteUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL || '').replace(
    /\/$/,
    '',
  );
  const canonicalUrl = `${siteUrl}/${lang}/${slug}`;

  if (!product) {
    return {
      title: `${resolved.name || sku} | ${brandingTitle}`,
      description: resolved.name || sku,
      alternates: { canonical: canonicalUrl },
    };
  }

  const productName = product.name || resolved.name || sku;
  const productDescription =
    product.short_description ||
    product.description?.replace(/<[^>]*>/g, '').slice(0, 160) ||
    `${productName} - SKU: ${sku}`;
  const productImage =
    product.cover_image_url ||
    product.image?.original ||
    product.images?.[0]?.url ||
    '';
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
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${productName} - ${sku}`,
      description: productDescription,
      url: canonicalUrl,
      siteName: brandingTitle,
      type: 'website',
      locale: lang === 'it' ? 'it_IT' : 'en_US',
      images: productImage
        ? [{ url: productImage, width: 1200, height: 1200, alt: productName }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${productName} - ${sku}`,
      description: productDescription,
      images: productImage ? [productImage] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default async function FlatSlugPage({ params }: RouteParams) {
  const { lang, slug } = await params;

  // 1) CMS page → render it (CMS wins, spec D3).
  const page = await getCachedCmsPage(slug, lang);
  if (page) {
    return (
      <CmsPageRenderer blocks={page.blocks ?? []} pageSlug={slug} lang={lang} />
    );
  }

  // 2) Else resolve the slug to a product via vcs → render product detail.
  const resolved = await resolveProduct(slug, lang);
  if (!resolved) notFound();

  return renderProductDetail(resolved, slug, lang);
}

/**
 * Render the product detail by SKU, reusing the `products/[...slug]` pattern:
 * page-layout blocks + JSON-LD + React Query prefetch (group_variants). The
 * canonical URL is the flat slug (D4).
 */
async function renderProductDetail(
  resolved: ResolvedProduct,
  slug: string,
  lang: string,
) {
  const sku = resolved.sku;
  const queryClient = new QueryClient();
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;

  const productQueryParams = {
    limit: 1,
    filters: { sku: [sku] },
    group_variants: true,
    include_dynamic_blocks: true,
  };

  const [blocks, product] = await Promise.all([
    (async () => {
      let b = await getProductDetailBlocksNew(sku, sku, false);
      if (!b || b.length === 0) {
        b = await getProductDetailBlocksOld(sku, undefined, undefined, false);
      }
      return b;
    })(),
    fetchProductForSeo(sku, lang),
    queryClient.prefetchQuery({
      // Match the client hook's ['pim-search', customerContext, params]
      // shape. SSR cannot read the localStorage customer selection, so it
      // hydrates the neutral context and the client refetches for a selection.
      queryKey: ['pim-search', {}, productQueryParams],
      queryFn: async () => {
        const result = await serverFetchPimProducts({
          lang,
          rows: 1,
          filters: { sku: [sku] },
          group_variants: true,
          include_dynamic_blocks: true,
          authenticated: isAuthenticated,
        });
        return transformPimProducts(result.results).map((p) => ({
          ...p,
          variantCount: p.variations?.length || 1,
        }));
      },
    }),
  ]);

  const siteUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL || '').replace(
    /\/$/,
    '',
  );
  const canonicalUrl = `${siteUrl}/${lang}/${slug}`;

  return (
    <>
      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name || resolved.name || sku,
              description: (
                product.short_description ||
                product.description?.replace(/<[^>]*>/g, '') ||
                ''
              ).slice(0, 500),
              sku,
              image:
                product.cover_image_url ||
                product.images?.[0]?.url ||
                undefined,
              brand: product.brand
                ? { '@type': 'Brand', name: product.brand.label }
                : undefined,
              url: canonicalUrl,
            }),
          }}
        />
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProductDetailWithPreview
          lang={lang}
          sku={sku}
          serverBlocks={blocks || []}
          isPreview={false}
        />
      </HydrationBoundary>
    </>
  );
}
