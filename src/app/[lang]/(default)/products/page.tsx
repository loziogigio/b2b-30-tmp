import { getProductDetailBlocks as getProductDetailBlocksOld } from '@/lib/db/product-templates';
import { getProductDetailBlocks as getProductDetailBlocksNew } from '@/lib/db/product-templates-simple';
import { ProductDetailWithPreview } from '@components/product/ProductDetailWithPreview';
import ProductsPageContent from './products-page-content';

export default async function Page({
  params,
  searchParams
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
  let blocks = await getProductDetailBlocksNew(
    sku,      // productSku
    sku,      // parentSku (fallback to sku for now)
    isPreview
  );

  // If no blocks found with new system, fallback to old system
  if (!blocks || blocks.length === 0) {
    blocks = await getProductDetailBlocksOld(
      sku,
      undefined, // categoryIds
      undefined, // tags
      isPreview
    );
  }

  // Use ProductDetailWithPreview wrapper to enable live postMessage updates
  return (
    <ProductDetailWithPreview
      lang={lang}
      sku={sku}
      serverBlocks={blocks || []}
      isPreview={isPreview}
    />
  );
}
