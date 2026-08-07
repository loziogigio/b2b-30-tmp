export type CategoriesQueryOptionsType = {
  text?: string;
  category?: string;
  status?: string;
  limit?: number;
};
export type QueryOptionsType = {
  text?: string;
  category?: string;
  status?: string;
  limit?: number;
};

export type Attachment = {
  id: string | number;
  thumbnail: string;
  original: string;
};
export type Category = {
  id: number | string;
  name: string;
  slug: string;
  details?: string;
  image?: Attachment;
  icon?: string;
  children?: [Category];
  products?: Product[];
  productCount?: number;
  [key: string]: unknown;
};
export type Brand = {
  id: number | string;
  name: string;
  slug: string;
  image?: Attachment;
  [key: string]: unknown;
};
export type Dietary = {
  id: number | string;
  name: string;
  slug: string;
  [key: string]: unknown;
};
export type Tag = {
  id: string | number;
  name: string;
  slug: string;
};
import type {
  PimPackagingInfo,
  PimPackagingOption,
  ProductPricing,
} from './types/pim-pricing';
import type { DynamicBlock } from './types/dynamic-blocks';

export type Product = {
  id: number | string;
  id_parent?: number | string;
  name: string;
  slug: string;
  /** Unit NET list price, derived from inline `pricing.list`. 0 when status !== 'priced'. */
  price: number;
  /** Unit GROSS list price (NET * (1 + vat_rate/100) when !vat_included). */
  priceGross?: number;
  /** Normalized inline pricing block; absent for products that never had a pricing payload. */
  pricing?: ProductPricing;
  /** Inline packaging options (with their own pricing + promotions). */
  packagingOptions?: PimPackagingOption[];
  /** Packaging info (UOM, description, default/smallest flags), referenced by code. */
  packagingInfo?: PimPackagingInfo[];
  quantity: number;
  sold: number;
  unit: string;
  sale_price?: number;
  min_price?: number;
  max_price?: number;
  image: Attachment;
  sku: string;
  parent_sku?: string;
  gallery?: Attachment[];
  category?: Category;
  tag?: Tag[];
  meta?: any[];
  brand?: Brand;
  model?: string;
  description?: string;
  html_description?: string; // HTML content for product detail tab
  attributes?: Record<string, { label: string; value: any; order?: number }>; // PIM attributes
  variations: Product[];
  features?: any[];
  [key: string]: unknown;
  docs?: Array<{
    id: number;
    url: string;
    area?: string;
    filename?: string;
    ext?: string;
  }>;
  // Marketing features (bullet points per language or direct array)
  marketing_features?: { [lang: string]: string[] } | string[];
  // Technical specifications (structured data - language nested or direct array)
  technical_specifications?:
    | {
        [lang: string]: Array<{
          key: string;
          value: string;
          label?: string;
          uom?: string;
          order?: number;
        }>;
      }
    | Array<{
        key: string;
        value: string;
        label?: string;
        uom?: string;
        order?: number;
      }>;
  // Per-product rich content blocks (present only when detail fetch requests include_dynamic_blocks)
  dynamic_blocks?: DynamicBlock[];
  // Content badges stamped by the search API (video / 3D model / related products).
  // Declared explicitly so they survive the `[key: string]: unknown` index
  // signature and stay type-checked at the badge call sites.
  has_video?: boolean;
  has_3d?: boolean;
  has_correlations?: boolean;
  // EAN/barcode, normalised to a single string by the product transform (PIM
  // stores it multi-value). Declared explicitly for the same reason as the
  // flags above: the index signature would otherwise type it as `unknown`.
  ean?: string;
};
export type {
  DynamicBlockSection,
  DynamicBlockColumns,
  BlockElementKind,
  BlockLink,
  BlockElementBase,
  MediaElement,
  TextElement,
  BlockElement,
  DynamicBlock,
  DynamicBlocks,
} from './types/dynamic-blocks';

export type OrderItem = {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
};
export type Order = {
  id: string | number;
  name: string;
  slug: string;
  products: OrderItem[];
  total: number;
  tracking_number: string;
  customer: {
    id: number;
    email: string;
  };
  shipping_fee: number;
  payment_gateway: string;
};
