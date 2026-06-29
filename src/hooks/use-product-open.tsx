'use client';

import { useRouter } from 'next/navigation';
import { useModalAction } from '@components/common/modal/modal.context';
import { useCatalogSettings } from './use-catalog-settings';

/**
 * Single source of truth for "what happens when a product is clicked" on the
 * catalog/search surfaces, driven by the channel `catalog_settings` config.
 *
 * - Multi-variant parent → always the variants quick-view modal (the chooser is
 *   the whole point of that modal).
 * - Single/simple product → `PRODUCT_VIEW` modal, OR a navigation to the product
 *   detail page when `product_open_mode === 'detail_page'`.
 *
 * Returns a stable-enough callback usable from grid cards, list rows, and search
 * rows so the open behaviour lives in one place.
 */
export function useProductOpen(lang: string) {
  const router = useRouter();
  const { openModal } = useModalAction();
  const { settings } = useCatalogSettings();

  return function openProduct(product: any, hasVariants: boolean) {
    if (hasVariants) {
      openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', product);
      return;
    }
    const sku = product?.sku;
    if (settings.productOpenMode === 'detail_page' && sku) {
      router.push(`/${lang}/products/${encodeURIComponent(String(sku))}`);
      return;
    }
    openModal('PRODUCT_VIEW', product);
  };
}
