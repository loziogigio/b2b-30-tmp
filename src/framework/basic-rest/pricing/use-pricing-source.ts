'use client';

import { useTenantOptional, useThemeId } from '@/contexts/tenant.context';
import { getThemePricingSource } from '@/lib/theme/pricing';
import {
  DEFAULT_PRICING_SOURCE,
  type PricingSource,
  getEnvPricingSource,
  normalizePricingSource,
} from './pricing-source';

/**
 * Resolve the active pricing source on the client.
 *
 * Priority (highest → lowest):
 *   1. tenant.features.pricingSource (per-tenant Mongo override)
 *   2. THEME_PRICING_SOURCE[theme]   (per-theme declaration, see lib/theme/pricing)
 *   3. NEXT_PUBLIC_PRICING_SOURCE   (env default)
 *   4. 'inline'                      (fallback)
 *
 * Tenant context is optional so this hook is safe to call from any
 * client component, even those rendered outside TenantProvider in tests
 * or storybook-like contexts.
 */
export function usePricingSource(): PricingSource {
  const ctx = useTenantOptional();
  const themeId = useThemeId();
  const tenantOverride = ctx?.tenant.features?.pricingSource;
  if (tenantOverride) {
    return normalizePricingSource(tenantOverride, DEFAULT_PRICING_SOURCE);
  }
  // The theme declares its own pricing source (lib/theme/pricing) so a theme's
  // price-data origin travels with the theme, not the global env. Undeclared
  // themes fall through to the env default below.
  const themeSource = getThemePricingSource(themeId);
  if (themeSource) return themeSource;
  return getEnvPricingSource();
}
