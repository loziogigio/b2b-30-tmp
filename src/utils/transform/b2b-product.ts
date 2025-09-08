import { Product, Attachment, Brand, Tag } from '@framework/types';

export interface RawProduct {
  id: string;
  sku: string
  id_parent: string;
  parent_sku: string;
  product_status: string;
  product_status_description: string;
  title: string;
  short_description: string;
  long_description: string;
  unit?: string;
  price?: number;
  sale_price?: number;
  quantity?: number;
  sold?: number;
  model?: string;
  features?:any[];
  images: {
    original: string;
    main: string;
    gallery: string;
    thumb: string;
  }[];
  brand?: {
    cprec_darti: string;
    tprec_darti: string;
  };
  tag?: Tag[];
  children_items: RawProduct[];
  [key: string]: any;
}

export function transformProduct(rawProducts: RawProduct[]): Product[] {
  const transformImage = (img: RawProduct['images'][0]): Attachment => ({
    id: 1,
    original: img?.original || '',
    thumbnail: img?.main || '',
  });

  const transformSingle = (item: RawProduct): Product => {
    const mainImage = item.images?.[0];

    const image: Attachment = mainImage
      ? transformImage(mainImage)
      : { id: 1, thumbnail: '', original: '' };

    const gallery: Attachment[] = item.images?.map((img, index) => ({
      id: index + 1,
      thumbnail: img.main,
      original: img.original,
    })) || [];

    const brand: Brand | undefined = item.brand
      ? {
        id: item.brand.cprec_darti,
        name: item.brand.tprec_darti,
        slug: item.brand.cprec_darti.toLowerCase(),
        brand_image: Array.isArray(item.brand_image) && item.brand_image.length > 0
          ? item.brand_image[0]
          : undefined,
      }
      : undefined;

    // 👇 Transform children_items recursively (as full Product objects)
    const variations: Product[] = item.children_items?.length
      ? transformProduct(item.children_items)
      : [];

    return {
      id: item.id,
      sku: item.sku,
      id_parent: item.id_parent,
      parent_sku: item.parent_sku,
      product_status: item.product_status,
      product_status_description: item.product_status_description,
      name: item.title || item.sku,
      slug: item.sku.toLowerCase().replace(/\s+/g, '-'),
      description: item.short_description || '',
      long_description: item.long_description || '',
      price: item.price || 0,
      sale_price: item.sale_price,
      quantity: item.quantity || 100,
      sold: item.sold || 0,
      unit: item.unit || '',
      model: item.model || '',
      image,
      gallery,
      brand,
      tag: item.tag || [],
      variations: variations, // full Product[] as variations
      features:item.features
    };
  };

  return rawProducts.map(transformSingle);
}


export function transformSearchParams(params: Record<string, any>): Record<string, any> {
  // 🟢 Pre-step: ensure category is included in search entries
  if (params.category) {
    if (!params.search) {
      params.search = {};
    }
    if (typeof params.search === 'object' && !Array.isArray(params.search)) {
      params.search.category = params.category;
    }
  }

  if (!params.search) return params;

  const result: Record<string, any> = {
    ...params,
    filters: {
      ...(params.filters || {}),
    },
  };

  let entries: Record<string, any> = {};

  // Case 1: search is a string
  if (typeof params.search === 'string') {
    const queryString = params.search.startsWith('shop?')
      ? params.search.replace(/^shop\?/, '')
      : params.search;
    const searchParams = new URLSearchParams(queryString);
    entries = Object.fromEntries(searchParams);
  }

  // Case 2: search is an object
  if (typeof params.search === 'object' && !Array.isArray(params.search)) {
    entries = params.search;
  }

  for (const key in entries) {
    const rawValue = entries[key];
    const value = typeof rawValue === 'string' ? rawValue.toLowerCase() : rawValue;

    // ✅ Normalize the key
    let mappedKey = key;

    // Strip `filters-` prefix if present
    if (mappedKey.startsWith('filters-')) {
      mappedKey = mappedKey.replace(/^filters-/, '');
    }

    if (key === 'product_parent_codes') mappedKey = 'codice_figura';
    if (key === 'sku') mappedKey = 'carti';
    if (key === 'category') mappedKey = 'category';

    if (key === 'text') {
      result.text = value;
    } else {
      result.filters[mappedKey] = value.split(';').filter(Boolean);
    }
  }
  // Normalize `page` (reduce by 1 if > 0)
  if (typeof result.start === 'number' && result.start > 0) {
    result.start = result.start - 1;
  }

  delete result.search;
  return result;
}
