/**
 * Pricing source toggle.
 *
 * The B2B app supports three pricing data sources, switchable at runtime
 * without a redeploy when backed by tenant config:
 *
 *   - 'inline'  Synth ErpPriceData from the PIM product's inline pricing
 *               block (product.pricing + product.packagingOptions). No ERP
 *               roundtrip. Cheapest + fastest paint; the default.
 *
 *   - 'erp'     Legacy mode: POST /api/v1/erp/get_multiple_prices and use
 *               the response. Customer-specific pricing, but adds an HTTP
 *               roundtrip per surface and depends on ERP availability.
 *
 *   - 'hybrid'  Synth from inline immediately (so cards/grids paint
 *               instantly), then fetch ERP in the background and merge
 *               overrides for customer-specific fields (net_price,
 *               availability, product_label_action, buy_did…). When ERP
 *               fails, the inline synth stays — never blocks the UI.
 *
 * Resolution order (highest → lowest):
 *   1. tenant.features.pricingSource    (MongoDB per-tenant, hot-swappable)
 *   2. NEXT_PUBLIC_PRICING_SOURCE        (env, build-time global default)
 *   3. 'inline'                          (final fallback)
 */

export type PricingSource = 'inline' | 'erp' | 'hybrid';

export const DEFAULT_PRICING_SOURCE: PricingSource = 'inline';

const VALID_SOURCES: ReadonlySet<PricingSource> = new Set([
  'inline',
  'erp',
  'hybrid',
]);

export function isPricingSource(value: unknown): value is PricingSource {
  return typeof value === 'string' && VALID_SOURCES.has(value as PricingSource);
}

export function normalizePricingSource(
  value: unknown,
  fallback: PricingSource = DEFAULT_PRICING_SOURCE,
): PricingSource {
  if (isPricingSource(value)) return value;
  return fallback;
}

/**
 * Resolve the pricing source for non-React contexts (server route handlers,
 * tests, module-level helpers). Only consults env — tenant overrides flow
 * through the React hook because they live in TenantContext.
 */
export function getEnvPricingSource(): PricingSource {
  return normalizePricingSource(
    process.env.NEXT_PUBLIC_PRICING_SOURCE,
    DEFAULT_PRICING_SOURCE,
  );
}
