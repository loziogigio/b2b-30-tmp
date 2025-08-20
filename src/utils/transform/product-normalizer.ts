// utils/product-normalizer.ts
import type { Product } from '@framework/types';

export function normalizeSingleVariation(p: Product): Product {
  const list = Array.isArray(p.variations) ? p.variations : [];
  if (list.length !== 1) return p;

  const v = list[0] as Product;

  // Variant overrides key fields; keep helpful parent context
  return {
    ...p,
    ...v,
    id_parent: p.id_parent ?? p.id,
    parent_sku: p.parent_sku ?? p.sku,
    // prefer variant media if present, otherwise fall back to parent
    image: v.image ?? p.image,
    gallery: (v.gallery && v.gallery.length ? v.gallery : p.gallery) ?? [],
    // no nested variations after normalization
    variations: [],
  };
}
