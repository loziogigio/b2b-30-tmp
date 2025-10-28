# Buildable Product Detail Pages - Template System

This document explains the **template-based** buildable product detail page system for the Hidros customer web application.

## Overview

The buildable product detail system uses **templates** instead of individual page configurations, making it efficient even with 50,000+ products. You create:

- **1 Default Template** - Applies to ALL products by default
- **Category Templates** - Apply to all products in a category (e.g., "Faucets", "Showers")
- **Product-Specific Templates** - Only for special products needing custom layouts

This means you might have **10-20 templates total** instead of 50,000+ individual pages!

## Architecture

### Template Priority System

When a product detail page loads, the system finds the best matching template:

1. **Product-specific template** (Priority 20) - Exact match for productId
2. **Category template** (Priority 10) - Matches product's category
3. **Default template** (Priority 0) - Fallback for all products

Example:
- Product "VALVE-202" in category "Valves"
- If template exists for product "VALVE-202" → use it
- Else if template exists for category "Valves" → use it
- Else use default template

### Database Schema

**ProductTemplate Collection**:
```typescript
{
  templateId: "default-product-detail" | "category-faucets" | "product-VALVE-202",
  name: "Default Product Detail Template",
  type: "default" | "category" | "product",
  priority: 0 | 10 | 20,
  matchCriteria: {
    categoryIds: ["cat-123", "cat-456"],  // For category templates
    productIds: ["VALVE-202"],             // For product templates
    tags: ["featured", "new"]              // Optional tag matching
  },
  versions: [...],                         // Version control
  currentVersion: 1,
  currentPublishedVersion: 1,
  isActive: true
}
```

### File Structure

```
src/
├── lib/
│   ├── db/
│   │   ├── connection.ts              # MongoDB connection
│   │   ├── models/
│   │   │   ├── page.ts               # Legacy page model
│   │   │   └── product-template.ts   # ✨ New template model
│   │   ├── pages.ts                  # Legacy page utilities
│   │   └── product-templates.ts      # ✨ Template matching logic
│   └── types/
│       └── blocks.ts                 # Block type definitions
└── components/
    └── blocks/
        ├── BlockRenderer.tsx          # Main block router
        ├── ProductInfoBlock.tsx       # Product information
        ├── ProductSuggestionsBlock.tsx # Related products
        ├── RichTextBlock.tsx          # Rich text content
        ├── CustomHTMLBlock.tsx        # Raw HTML
        └── SpacerBlock.tsx            # Spacing
```

## Installation

### 1. Install Dependencies

```bash
cd /home/jire87/software/www-website/www-data/hidros-app/customer_web
pnpm add mongoose
```

### 2. Environment Configuration

Add to `.env.local`:

```bash
# MongoDB Configuration
HIDROS_MONGO_URL=mongodb://admin:admin@localhost:27017/?authSource=admin
HIDROS_MONGO_DB=hidros_app
HIDROS_MONGO_MIN_POOL_SIZE=0
HIDROS_MONGO_MAX_POOL_SIZE=50
```

**Important**: Use the SAME database as your vinc-storefront B2B portal.

## Usage

### Creating Templates

#### 1. Default Template (Applies to All Products)

In the B2B Product Builder:
- Navigate to `/b2b/product-builder`
- This creates/edits the default template
- All products will use this unless overridden

#### 2. Category Template

For all products in a category (e.g., "Faucets"):
- Navigate to `/b2b/product-builder?template=category&categoryId=faucets`
- Build custom layout for all faucet products
- Products in "Faucets" category will use this template

#### 3. Product-Specific Template

For one special product:
- Navigate to `/b2b/product-builder?template=product&productId=VALVE-202`
- Build custom layout just for VALVE-202
- Only this product will use this template

### Template Management Functions

```typescript
import {
  ensureDefaultTemplate,
  createCategoryTemplate,
  createProductTemplate,
  findMatchingTemplate
} from '@/lib/db/product-templates';

// Create default template
await ensureDefaultTemplate();

// Create category template
await createCategoryTemplate('faucets', 'Faucets Template');

// Create product-specific template
await createProductTemplate('VALVE-202', 'VALVE-202 Custom Layout');

// Find best matching template for a product
const template = await findMatchingTemplate({
  productId: 'VALVE-202',
  categoryIds: ['faucets', 'bathroom'],
  tags: ['premium', 'featured']
});
```

## How It Works

### Server-Side Rendering Flow

1. User visits `/en/products/2040700`
2. Page component calls `getProductDetailBlocks('2040700', categoryIds, tags)`
3. System queries templates with matching criteria:
   - Product-specific: `productIds` contains '2040700'
   - Category: `categoryIds` overlaps with product categories
   - Default: always matches
4. Returns highest priority template's published blocks
5. Renders blocks server-side
6. If no template found, falls back to B2BProductDetail component

### Example Scenarios

**Scenario 1: Standard Product**
- Product: Faucet #12345
- Category: Faucets
- Template Used: Category "Faucets" template (if exists), else Default

**Scenario 2: Featured Product**
- Product: VALVE-202
- Category: Valves
- Has custom template for VALVE-202
- Template Used: Product-specific VALVE-202 template

**Scenario 3: New Category**
- Product: Shower #99999
- Category: Showers (no template yet)
- Template Used: Default template

## Block Types

### 1. Product Info Block
Displays core product information.

```typescript
{
  variant: "productInfo",
  showImages: true,
  showPrice: true,
  showDescription: true,
  showSpecifications: true,
  showAvailability: true,
  layout: "default" | "wide" | "compact"
}
```

### 2. Product Suggestions Block
Related products via search/filters.

```typescript
{
  variant: "productSuggestions",
  title: "Related Products",
  source: "search" | "related" | "manual",
  searchQuery: "lavabo",
  searchFilters: { "promo_type": "ZZZ" },
  productIds: ["123", "456"],  // For manual source
  limit: 12,
  layout: "grid" | "slider",
  columns: { mobile: 2, tablet: 3, desktop: 4 }
}
```

### 3. Rich Text Block
Formatted HTML content.

```typescript
{
  variant: "richText",
  content: "<h2>About this product</h2><p>...</p>",
  width: "full" | "contained",
  textAlign: "left" | "center" | "right",
  padding: "none" | "small" | "medium" | "large"
}
```

### 4. Custom HTML Block
Maximum flexibility.

```typescript
{
  variant: "customHTML",
  html: "<div class='special-section'>...</div>",
  containerClass: "my-custom-wrapper"
}
```

### 5. Spacer Block
Vertical spacing.

```typescript
{
  variant: "spacer",
  height: 40,
  unit: "px" | "rem"
}
```

## Scaling Considerations

### With 50,000 Products

**Old Approach (❌ BAD)**:
- 50,000 page documents in database
- 50,000 separate configurations
- Massive storage and slow queries

**New Approach (✅ GOOD)**:
- 1 default template
- ~10-20 category templates
- ~5-10 special product templates
- **Total: ~30 templates** for 50,000 products!

### Performance Benefits

1. **Fast Queries**: Indexed by type, priority, categoryIds, productIds
2. **Minimal Storage**: Only store what's custom
3. **Easy Management**: Update category template → affects 1000s of products
4. **Flexible**: Can still customize individual products when needed

## Integration with Product Data

To enable category and tag matching, update your product page:

```typescript
// src/app/[lang]/(default)/products/[slug]/page.tsx

export default async function Page({ params }: { params: any }) {
  const { lang, slug } = params;

  // Fetch product data (adapt to your API)
  const product = await getProduct(slug);
  const categoryIds = product.categories?.map(c => c.id) || [];
  const tags = product.tags || [];

  // Get blocks with full context
  const blocks = await getProductDetailBlocks(slug, categoryIds, tags);

  // Render...
}
```

## Version Control

Each template supports versioning:
- **Draft versions** - Work in progress
- **Published versions** - Live on customer site
- **Hot fixes** - Quick updates without new version

Only published versions render on the customer-facing website.

## Extending the System

### Adding New Block Types

1. **Define type** in `src/lib/types/blocks.ts`
2. **Create component** in `src/components/blocks/`
3. **Register** in `BlockRenderer.tsx`

(See previous documentation for details)

## Migration from Old System

If you have existing page-based configurations:

```typescript
// Migration script (run once)
import { PageModel } from '@/lib/db/models/page';
import { createProductTemplate } from '@/lib/db/product-templates';

async function migratePages() {
  const pages = await PageModel.find({
    slug: { $regex: /^product-detail-/ }
  });

  for (const page of pages) {
    const productId = page.slug.replace('product-detail-', '');
    await createProductTemplate(productId, page.name);
    // Copy blocks, versions, etc.
  }
}
```

## API Updates Needed in B2B Builder

Update the product builder (vinc-storefront) to support template types:

```typescript
// Example: /api/templates/save
{
  templateType: "default" | "category" | "product",
  templateId: "category-faucets",
  matchCriteria: {
    categoryIds: ["faucets"]
  },
  blocks: [...]
}
```

## Troubleshooting

### No template found for product
- Check default template exists: `ensureDefaultTemplate()`
- Verify template is published (not just saved as draft)
- Check `isActive: true`

### Wrong template applied
- Check priority values (product=20, category=10, default=0)
- Verify matchCriteria (categoryIds, productIds)
- Use `findMatchingTemplate()` to debug

### TypeScript errors
- Run `pnpm check-types`
- Ensure path aliases configured in tsconfig.json
- Install mongoose types

## Summary

**Key Benefits**:
- ✅ Scalable to millions of products
- ✅ Efficient database usage (~30 templates vs 50k pages)
- ✅ Server-side rendering for SEO
- ✅ Flexible customization at product/category/default level
- ✅ Version control for all templates
- ✅ Fallback to existing component if no template

**Next Steps**:
1. Install mongoose: `pnpm add mongoose`
2. Configure environment variables
3. Create default template in B2B builder
4. Create 1-2 category templates for testing
5. Verify rendering on customer web
6. Customize block components as needed
