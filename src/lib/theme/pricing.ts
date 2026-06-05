import type { ThemeId } from './types';
import type { PricingSource } from '@framework/pricing';

/**
 * Pricing source declared per theme.
 *
 * A theme's price-data origin (inline PIM synth / ERP API / hybrid) is a
 * property of the theme itself, not of the deployment: the `time` storefront
 * is built around ERP pricing, so it declares `erp` here instead of depending
 * on the global NEXT_PUBLIC_PRICING_SOURCE env.
 *
 * usePricingSource() consults this BELOW an explicit per-tenant override
 * (tenant.features.pricingSource) and ABOVE the env fallback, so:
 *   - a tenant can still force any source via config, and
 *   - a theme left undeclared here keeps the env / default behaviour.
 */
export const THEME_PRICING_SOURCE: Partial<Record<ThemeId, PricingSource>> = {
  time: 'erp',
};

/** Theme-declared pricing source, or undefined when the theme defers to env. */
export function getThemePricingSource(
  themeId: string,
): PricingSource | undefined {
  return THEME_PRICING_SOURCE[themeId as ThemeId];
}
