import { cache } from 'react';
import { headers } from 'next/headers';
import {
  buildTenantApiHeaders,
  withResolvedTenant,
  isSingleTenant,
} from '@/lib/tenant';
import { resolveSupportedLang } from '@/app/i18n/settings';
import { cacheTag, SINGLE_TENANT_ID } from '@/lib/cache/tags';

/**
 * Server-side product fetch for SEO metadata generation.
 * Used by generateMetadata in product pages.
 *
 * Supports both single-tenant and multi-tenant modes.
 */

// Single-tenant config from .env
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_PRIVATE_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;
const PIM_API_URL_OVERRIDE = process.env.PIM_API_URL_OVERRIDE;

interface FetchConfig {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
  lang: string;
  sku: string;
  tenantId: string;
}

async function fetchProductWithConfig(config: FetchConfig) {
  const { pimApiUrl, apiKeyId, apiSecret, lang, sku, tenantId } = config;
  const url = `${pimApiUrl}/api/search/search`;

  try {
    const search = async (filters: Record<string, string[]>) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildTenantApiHeaders(
          { apiKeyId, apiSecret },
          { includeLegacyApiKeyAlias: true },
        ),
        body: JSON.stringify({
          lang,
          text: '',
          rows: 1,
          filters,
          group_variants: true,
          include_dynamic_blocks: true,
        }),
        next: { revalidate: 300, tags: [cacheTag('products', tenantId)] },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.success && data.data?.results?.length ? data : null;
    };

    // A catalog identity can be a concrete SKU or a parent SKU whose actual
    // indexed documents are its variants. The resolver/sitemap intentionally
    // expose both, so metadata must follow the same identity contract.
    const data =
      (await search({ sku: [sku] })) || (await search({ parent_sku: [sku] }));
    if (!data) return null;

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
        tenantId: SINGLE_TENANT_ID,
      });
    }

    // Keep registry credentials inside this server-only operation. Only the
    // final public product result becomes an awaited RSC value.
    return withResolvedTenant(hostname, (tenant) => {
      if (!tenant) return null;

      return fetchProductWithConfig({
        pimApiUrl: PIM_API_URL_OVERRIDE || tenant.api.pimApiUrl,
        apiKeyId: tenant.api.apiKeyId,
        apiSecret: tenant.api.apiSecret,
        lang,
        sku,
        tenantId: tenant.id,
      });
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

    return cachedFetch(sku, resolveSupportedLang(lang), hostname);
  } catch {
    return null;
  }
}
