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
export type Product = {
  id: number | string;
  id_parent?: number | string;
  name: string;
  slug: string;
  price: number;
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
};
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
