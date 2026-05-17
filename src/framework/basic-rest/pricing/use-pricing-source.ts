'use client';

import { useTenantOptional } from '@/contexts/tenant.context';
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
 *   2. NEXT_PUBLIC_PRICING_SOURCE   (env default)
 *   3. 'inline'                      (fallback)
 *
 * Tenant context is optional so this hook is safe to call from any
 * client component, even those rendered outside TenantProvider in tests
 * or storybook-like contexts.
 */
export function usePricingSource(): PricingSource {
  const ctx = useTenantOptional();
  const tenantOverride = ctx?.tenant.features?.pricingSource;
  if (tenantOverride) {
    return normalizePricingSource(tenantOverride, DEFAULT_PRICING_SOURCE);
  }
  return getEnvPricingSource();
}
