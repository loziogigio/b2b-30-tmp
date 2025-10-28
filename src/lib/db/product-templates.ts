import { connectToDatabase } from "./connection";
import { ProductTemplateModel, type ProductTemplateDocument } from "./models/product-template";
import type { PageBlock } from "@/lib/types/blocks";

interface ProductContext {
  productId: string;
  categoryIds?: string[];
  tags?: string[];
}

const serializeBlock = (
  block: { id: string; type: string; order?: number; config: unknown; metadata?: Record<string, unknown> }
): PageBlock => ({
  id: String(block.id),
  type: String(block.type),
  order: Number(block.order ?? 0),
  config: block.config as any,
  metadata: block.metadata ?? {}
});

/**
 * Find the best matching template for a product
 * Priority order:
 * 1. Product-specific template (priority 20)
 * 2. Category template (priority 10)
 * 3. Default template (priority 0)
 */
export const findMatchingTemplate = async (
  context: ProductContext
): Promise<ProductTemplateDocument | null> => {
  await connectToDatabase();

  const { productId, categoryIds = [], tags = [] } = context;

  // Build query to find all potentially matching templates
  const query: any = {
    isActive: true,
    $or: [
      // Default template
      { type: "default" },
      // Product-specific template
      { type: "product", "matchCriteria.productIds": productId },
      // Category template
      ...(categoryIds.length > 0
        ? [{ type: "category", "matchCriteria.categoryIds": { $in: categoryIds } }]
        : []),
      // Tag-based template (optional)
      ...(tags.length > 0
        ? [{ "matchCriteria.tags": { $in: tags } }]
        : [])
    ]
  };

  // Find all matching templates, sorted by priority (highest first)
  const templates = await ProductTemplateModel.find(query)
    .sort({ priority: -1 })
    .lean<ProductTemplateDocument[]>();

  // Return the highest priority template with a published version
  for (const template of templates) {
    if (template.currentPublishedVersion && template.versions) {
      const publishedVersion = template.versions.find(
        (v: any) => v.version === template.currentPublishedVersion
      );
      if (publishedVersion) {
        return template;
      }
    }
  }

  return null;
};

/**
 * Get product detail blocks for server-side rendering
 * Finds the best matching template based on product context
 */
export const getProductDetailBlocks = async (
  productId: string,
  categoryIds?: string[],
  tags?: string[],
  usePreview: boolean = false
): Promise<PageBlock[]> => {
  try {
    const template = await findMatchingTemplate({
      productId,
      categoryIds,
      tags
    });

    if (!template) {
      return [];
    }

    // In preview mode, use the current draft version; otherwise use published version
    const targetVersion = usePreview ? template.currentVersion : template.currentPublishedVersion;

    const version = template.versions?.find(
      (v: any) => v.version === targetVersion
    );

    if (!version) {
      return [];
    }

    // Serialize and return blocks
    return Array.isArray(version.blocks)
      ? version.blocks.map((block: any) => serializeBlock(block))
      : [];
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `[getProductDetailBlocks] Falling back to default B2B detail component because block lookup failed for product "${productId}": ${reason}`,
        error
      );
    }
    return [];
  }
};

/**
 * Create or get default template
 */
export const ensureDefaultTemplate = async () => {
  await connectToDatabase();

  let template = await ProductTemplateModel.findOne({
    templateId: "default-product-detail",
    type: "default"
  }).lean<ProductTemplateDocument | null>();

  if (!template) {
    const now = new Date();
    const created = await ProductTemplateModel.create({
      templateId: "default-product-detail",
      name: "Default Product Detail Template",
      type: "default",
      priority: 0,
      matchCriteria: {},
      versions: [],
      currentVersion: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });
    template = created.toObject() as ProductTemplateDocument;
  }

  return template;
};

/**
 * Create a category-specific template
 */
export const createCategoryTemplate = async (
  categoryId: string,
  name: string
): Promise<ProductTemplateDocument> => {
  await connectToDatabase();

  const now = new Date();
  const template = await ProductTemplateModel.create({
    templateId: `category-${categoryId}`,
    name,
    type: "category",
    priority: 10,
    matchCriteria: {
      categoryIds: [categoryId]
    },
    versions: [],
    currentVersion: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  return template.toObject() as ProductTemplateDocument;
};

/**
 * Create a product-specific template
 */
export const createProductTemplate = async (
  productId: string,
  name: string
): Promise<ProductTemplateDocument> => {
  await connectToDatabase();

  const now = new Date();
  const template = await ProductTemplateModel.create({
    templateId: `product-${productId}`,
    name,
    type: "product",
    priority: 20,
    matchCriteria: {
      productIds: [productId]
    },
    versions: [],
    currentVersion: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  return template.toObject() as ProductTemplateDocument;
};
