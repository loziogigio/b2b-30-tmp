import { connectToDatabase } from './connection';
import { getProductTemplateSimpleModelForDb } from './model-registry';
import { type ProductTemplateDocument } from './models/product-template-simple';
import type { PageBlock } from '@/lib/types/blocks';

/**
 * Find the best matching template for a product
 * Priority: sku (30) > parentSku (20) > standard (10)
 */
export async function findMatchingTemplate(
  productSku: string,
  parentSku?: string,
): Promise<ProductTemplateDocument | null> {
  const connection = await connectToDatabase();

  // Get model from the tenant-specific connection (not default mongoose)
  const ProductTemplateModel = await getProductTemplateSimpleModelForDb(
    connection.name,
  );

  // Build query to find all potentially matching templates
  const matchConditions: any[] = [
    { 'matchRules.type': 'sku', 'matchRules.value': productSku },
    { 'matchRules.type': 'standard', 'matchRules.value': 'default' },
  ];

  if (parentSku) {
    matchConditions.push({
      'matchRules.type': 'parentSku',
      'matchRules.value': parentSku,
    });
  }

  // Find all matching templates, sorted by priority (highest first)
  const templates = await ProductTemplateModel.find({
    isActive: true,
    $or: matchConditions,
  })
    .sort({ 'matchRules.priority': -1 })
    .limit(1)
    .lean<ProductTemplateDocument[]>();

  return templates[0] || null;
}

/**
 * Get product detail blocks for server-side rendering
 * Finds the best matching template and returns blocks
 */
export async function getProductDetailBlocks(
  productSku: string,
  parentSku?: string,
  usePreview: boolean = false,
): Promise<PageBlock[]> {
  try {
    const template = await findMatchingTemplate(productSku, parentSku);

    if (!template) {
      console.log(
        '[getProductDetailBlocks] No template found (including standard fallback)',
      );
      return [];
    }

    // In preview mode, use the current draft version; otherwise use published version
    const targetVersion = usePreview
      ? template.currentVersion
      : template.currentPublishedVersion;

    if (!targetVersion) {
      return [];
    }

    const version = template.versions?.find(
      (v: any) => v.version === targetVersion,
    );

    if (!version) {
      return [];
    }

    // Serialize and return blocks with zone, tabLabel, tabIcon
    return Array.isArray(version.blocks)
      ? version.blocks.map((block: any, index) => {
          const serialized: any = {
            id: String(block.id),
            type: String(block.type),
            order: Number(block.order ?? index),
            config: block.config as any,
            metadata: block.metadata ?? {},
          };

          // Include zone - default to "zone1" for product detail blocks without zone
          // This handles legacy blocks saved before zone was implemented
          serialized.zone = block.zone || 'zone1';

          // Include tab properties if present
          if (block.tabLabel) {
            serialized.tabLabel = block.tabLabel;
          }
          if (block.tabIcon) {
            serialized.tabIcon = block.tabIcon;
          }

          return serialized;
        })
      : [];
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `[getProductDetailBlocks] Falling back to default B2B detail component because block lookup failed for product "${productSku}": ${reason}`,
        error,
      );
    }
    return [];
  }
}
