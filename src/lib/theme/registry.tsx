'use client';

import dynamic from 'next/dynamic';
import type { ThemeId } from './types';
import { useThemeId } from '@/contexts/tenant.context';
import { useMemo, type ComponentType } from 'react';

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
  | 'ProductDetail'
  | 'ProductPopup'
  | 'VariantsQuickView'
  | 'VariantsTable'
  | 'Cart'
  | 'SearchOverlay';

const registry: Record<ThemeId, Record<ComponentSlot, () => Promise<any>>> = {
  default: {
    Layout: () => import('@/components/themes/default/layout/default-layout'),
    ProductCard: () =>
      import('@/components/themes/default/product/default-product-card'),
    ProductRow: () =>
      import('@/components/themes/default/product/default-product-row'),
    HomeBlockRenderer: () =>
      import('@/components/themes/default/home/default-block-renderer'),
    SearchPageContent: () =>
      import('@/components/themes/default/search/default-search-content'),
    ProductDetail: () =>
      import('@/components/themes/default/product/default-product-detail'),
    ProductPopup: () =>
      import('@/components/themes/default/product/default-product-popup'),
    VariantsQuickView: () =>
      import('@/components/themes/default/product/default-variants-quick-view'),
    VariantsTable: () =>
      import('@/components/themes/default/product/default-variants-table'),
    Cart: () => import('@/components/themes/default/cart/default-cart'),
    SearchOverlay: () =>
      import('@/components/themes/default/search/default-search-overlay'),
  },
  time: {
    Layout: () => import('@/components/themes/time/layout/time-layout'),
    ProductCard: () =>
      import('@/components/themes/time/product/time-product-card'),
    HomeBlockRenderer: () =>
      import('@/components/themes/time/home/time-block-renderer'),
    SearchPageContent: () =>
      import('@/components/themes/time/search/time-search-content'),
    ProductDetail: () =>
      import('@/components/themes/time/product/time-product-detail'),
    // Fall back to default for slots not yet themed
    ProductRow: () =>
      import('@/components/themes/default/product/default-product-row'),
    ProductPopup: () =>
      import('@/components/themes/time/product/time-product-popup'),
    VariantsQuickView: () =>
      import('@/components/themes/time/product/time-variants-quick-view'),
    VariantsTable: () =>
      import('@/components/themes/time/product/time-variants-table'),
    Cart: () => import('@/components/themes/time/cart/time-cart'),
    SearchOverlay: () =>
      import('@/components/themes/time/search/time-search-overlay'),
  },
};

const VALID_THEMES: ThemeId[] = ['default', 'time'];

function asThemeId(value: string | undefined): ThemeId {
  return value && VALID_THEMES.includes(value as ThemeId)
    ? (value as ThemeId)
    : 'default';
}

// Pre-create a dynamic component per (slot, theme). Each entry is created on
// first access and cached, so callers using the same theme reuse the same
// next/dynamic instance and code-splitting still works.
type DynamicCache = Partial<Record<ComponentSlot, ComponentType<any>>>;
const dynamicCache: Record<ThemeId, DynamicCache> = {
  default: {},
  time: {},
};

function getDynamic<P>(
  slot: ComponentSlot,
  themeId: ThemeId,
): ComponentType<P> {
  const cached = dynamicCache[themeId][slot];
  if (cached) return cached as ComponentType<P>;
  const Comp = dynamic<P>(registry[themeId][slot], { ssr: true });
  dynamicCache[themeId][slot] = Comp;
  return Comp;
}

/**
 * Returns a wrapper component that picks the right themed implementation at
 * render time based on the tenant's `b2bTheme`. Reading the theme from
 * tenant context (instead of `process.env.NEXT_PUBLIC_THEME` at module load)
 * is what makes per-tenant theming work in multi-tenant mode.
 */
export function getThemedComponent<P = any>(
  slot: ComponentSlot,
): ComponentType<P> {
  const ThemedSlot: ComponentType<P> = (props) => {
    const themeId = asThemeId(useThemeId());
    const Component = useMemo(() => getDynamic<P>(slot, themeId), [themeId]);
    return <Component {...(props as any)} />;
  };
  ThemedSlot.displayName = `Themed(${slot})`;
  return ThemedSlot;
}
