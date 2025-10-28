import { getProductDetailBlocks as getProductDetailBlocksOld } from '@/lib/db/product-templates';
import { getProductDetailBlocks as getProductDetailBlocksNew } from '@/lib/db/product-templates-simple';
import { ProductDetailWithPreview } from '@components/product/ProductDetailWithPreview';

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<any>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { lang, slug: slugSegments } = await params;
  const search = await searchParams;
  const isPreview = search?.preview === 'true';

  // Join slug segments to handle SKUs with slashes (e.g., po27011/2zc)
  // With catch-all route [...slug], the slug param is an array
  const slug = Array.isArray(slugSegments) ? slugSegments.join('/') : slugSegments;

  // Try new simplified template matching first (sku/parentSku based)
  // For now, we'll use slug as both sku and parentSku
  // In production, fetch real product data to get the actual parentSku
  let blocks = await getProductDetailBlocksNew(
    slug,      // productSku
    slug,      // parentSku (fallback to slug for now)
    isPreview
  );

  // If no blocks found with new system, fallback to old system
  if (!blocks || blocks.length === 0) {
    blocks = await getProductDetailBlocksOld(
      slug,
      undefined, // categoryIds
      undefined, // tags
      isPreview
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
