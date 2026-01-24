import { Product, Attachment, Brand, Tag } from '@framework/types';

export interface RawProduct {
  id: string;
  sku: string;
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
  features?: any[];
  docs?: {
    media_area_id: string;
    url: string;
  }[];
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
  const transformSingle = (item: RawProduct): Product => {
    // Handle multiple image formats from different APIs:
    // 1. item.image object with thumbnail/original
    // 2. item.cover_image_url string
    // 3. item.images array with url or original/main properties
    const rawImage = item.image as any;
    const imagesArray = Array.isArray(item.images) ? item.images : [];
    const firstImage = imagesArray[0] as any;

    // Get main image URL from various possible sources
    const mainImageUrl =
      rawImage?.thumbnail ||
      rawImage?.original ||
      (item as any).cover_image_url ||
      firstImage?.url ||
      firstImage?.main ||
      firstImage?.original ||
      '';

    const image: Attachment = {
      id: 1,
      thumbnail: mainImageUrl,
      original: rawImage?.original || (item as any).cover_image_url || firstImage?.url || firstImage?.original || mainImageUrl,
    };

    const gallery: Attachment[] = imagesArray.map((img: any, index: number) => ({
      id: index + 1,
      thumbnail: img?.url || img?.main || img?.thumbnail || '',
      original: img?.url || img?.original || '',
    }));

    const brand: Brand | undefined = item.brand
      ? {
          id: item.brand.cprec_darti || '',
          name: item.brand.tprec_darti || '',
          slug: item.brand.cprec_darti?.toLowerCase() || '',
          brand_image:
            Array.isArray(item.brand_image) && item.brand_image.length > 0
              ? item.brand_image[0]
              : undefined,
        }
      : undefined;

    // 👇 Transform children_items recursively (as full Product objects)
    const variations: Product[] = item.children_items?.length
      ? transformProduct(item.children_items)
      : [];

    // 🔹 map docs -> Product.docs (defensive: API may return "" or object)
    const docsArray = Array.isArray(item.docs) ? item.docs : [];
    const docs = docsArray.map((d, i) => {
      const filename = d?.url?.split('/').pop() ?? '';
      const ext = filename.includes('.')
        ? filename.split('.').pop()?.toLowerCase()
        : undefined;
      return {
        id: i + 1,
        url: d?.url || '',
        area: (d as any)?.media_area_id,
        filename,
        ext,
      };
    });

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
      features: item.features,
      docs,
    };
  };

  return rawProducts.map(transformSingle);
}

export function transformSearchParams(
  params: Record<string, any>,
): Record<string, any> {
  const nextParams: Record<string, any> = {
    ...params,
  };

  const filters: Record<string, string[]> = {
    ...(Array.isArray(params.filters) ? {} : params.filters || {}),
  };

  if (nextParams.category) {
    const categoryValues = Array.isArray(nextParams.category)
      ? nextParams.category
      : [nextParams.category];
    filters.category = Array.from(
      new Set([
        ...(filters.category || []),
        ...categoryValues.map((value) => String(value).trim()).filter(Boolean),
      ]),
    );
  }

  if (!nextParams.search) {
    return {
      ...nextParams,
      filters,
      start:
        typeof nextParams.start === 'number' && nextParams.start > 0
          ? nextParams.start - 1
          : 0,
    };
  }

  let searchEntries: Record<string, any> = {};

  if (typeof nextParams.search === 'string') {
    const rawSearch = nextParams.search.trim();
    const withoutLeadingSlash = rawSearch.startsWith('/')
      ? rawSearch.slice(1)
      : rawSearch;
    // Handle various prefixes: shop?, search?, or just ?
    let queryString = withoutLeadingSlash;
    if (queryString.startsWith('shop?')) {
      queryString = queryString.slice(5);
    } else if (queryString.startsWith('search?')) {
      queryString = queryString.slice(7);
    } else if (queryString.startsWith('?')) {
      queryString = queryString.slice(1);
    }
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      searchEntries[key] = value;
    });
  } else if (
    typeof nextParams.search === 'object' &&
    !Array.isArray(nextParams.search)
  ) {
    searchEntries = nextParams.search;
  }

  for (const key of Object.keys(searchEntries)) {
    const rawValue = searchEntries[key];
    if (rawValue == null) continue;

    let mappedKey = key.startsWith('filters-')
      ? key.replace(/^filters-/, '')
      : key;
    if (mappedKey === 'product_parent_codes') {
      mappedKey = 'codice_figura';
    } else if (mappedKey === 'sku') {
      mappedKey = 'carti';
    }

    if (key === 'text') {
      nextParams.text = Array.isArray(rawValue)
        ? rawValue.join(' ')
        : String(rawValue);
      continue;
    }

    const values = Array.isArray(rawValue)
      ? rawValue
      : String(rawValue)
          .split(';')
          .map((value) => value.trim())
          .filter(Boolean);

    if (!values.length) continue;

    filters[mappedKey] = Array.from(
      new Set([...(filters[mappedKey] || []), ...values]),
    );
  }

  const result: Record<string, any> = {
    ...nextParams,
    filters,
  };

  delete result.search;

  result.start =
    typeof result.start === 'number' && result.start > 0 ? result.start - 1 : 0;

  return result;
}
