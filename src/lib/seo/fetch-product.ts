import { cache } from 'react';
import { headers } from 'next/headers';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

/**
 * Server-side product fetch for SEO metadata generation.
 * Used by generateMetadata in product pages.
 *
 * Supports both single-tenant and multi-tenant modes.
 */

// Single-tenant config from .env
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_PRIVATE_URL ||
  process.env.NEXT_PUBLIC_PIM_API_URL ||
  '';
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

interface FetchConfig {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
  lang: string;
  sku: string;
}

async function fetchProductWithConfig(config: FetchConfig) {
  const { pimApiUrl, apiKeyId, apiSecret, lang, sku } = config;
  const url = `${pimApiUrl}/api/search/search`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKeyId && { 'X-API-Key': apiKeyId }),
        ...(apiSecret && { 'X-API-Secret': apiSecret }),
      },
      body: JSON.stringify({
        lang,
        text: '',
        rows: 1,
        filters: { sku: [sku] },
      }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.data?.results?.length) return null;

    const product = data.data.results[0];
    // If product has variants, use the first variant
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return { ...product, ...product.variants[0] };
    }
    return product;
  } catch {
    return null;
  }
}

// Cache per SKU+lang within same request
const cachedFetch = cache(
  async (sku: string, lang: string, hostname: string) => {
    // Single-tenant mode
    if (isSingleTenant) {
      return fetchProductWithConfig({
        pimApiUrl: DEFAULT_PIM_API_URL,
        apiKeyId: DEFAULT_API_KEY_ID,
        apiSecret: DEFAULT_API_SECRET,
        lang,
        sku,
      });
    }

    // Multi-tenant mode: resolve tenant from hostname
    const tenant = await resolveTenant(hostname);
    if (!tenant) {
      return null;
    }

    return fetchProductWithConfig({
      pimApiUrl: tenant.api.pimApiUrl,
      apiKeyId: tenant.api.apiKeyId,
      apiSecret: tenant.api.apiSecret,
      lang,
      sku,
    });
  },
);

export async function fetchProductForSeo(sku: string, lang: string) {
  try {
    const headersList = await headers();
    const hostname =
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost';

    return cachedFetch(sku, lang, hostname);
  } catch {
    return null;
  }
}
