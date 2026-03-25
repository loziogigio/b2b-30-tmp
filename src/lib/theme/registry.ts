'use client';

import dynamic from 'next/dynamic';
import type { ThemeId } from './types';
import { getThemeId } from './resolver';
import type { ComponentType } from 'react';

/**
 * Component slots that can be themed.
 * Each slot maps to a dynamic import per theme.
 */
type ComponentSlot =
  | 'Layout'
  | 'ProductCard'
  | 'ProductRow'
  | 'HomeBlockRenderer'
  | 'SearchPageContent'
  | 'ProductDetail';

const registry: Record<ThemeId, Record<ComponentSlot, () => Promise<any>>> = {
  default: {
    Layout: () => import('@/layouts/b2b/layout'),
    ProductCard: () =>
      import('@/components/product/product-cards/product-card-b2b'),
    ProductRow: () =>
      import('@/components/product/product-rows/product-row-b2b'),
    HomeBlockRenderer: () => import('@/components/blocks/HomeBlockRenderer'),
    SearchPageContent: () =>
      import('@/app/[lang]/(default)/search/search-b2b-page-content'),
    ProductDetail: () => import('@/components/product/product-b2b-details'),
  },
  time: {
    Layout: () => import('@/components/themes/time/layout/time-layout'),
    ProductCard: () =>
      import('@/components/themes/time/product/time-product-card'),
    HomeBlockRenderer: () =>
      import('@/components/themes/time/home/time-block-renderer'),
    // Fall back to default for slots not yet themed
    ProductRow: () =>
      import('@/components/product/product-rows/product-row-b2b'),
    SearchPageContent: () =>
      import('@/app/[lang]/(default)/search/search-b2b-page-content'),
    ProductDetail: () => import('@/components/product/product-b2b-details'),
  },
};

/**
 * Returns a dynamically imported component for the current theme.
 * Uses next/dynamic for code-splitting — only the active theme's code is loaded.
 */
export function getThemedComponent<P = any>(
  slot: ComponentSlot,
): ComponentType<P> {
  const themeId = getThemeId();
  return dynamic<P>(registry[themeId][slot], { ssr: true });
}
