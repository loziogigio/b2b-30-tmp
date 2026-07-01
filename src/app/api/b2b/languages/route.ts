import { NextRequest, NextResponse } from 'next/server';
import { buildTenantApiHeaders, resolveTenantApiConfig } from '@/lib/tenant';

export interface EnabledLanguage {
  code: string;
  name: string;
  nativeName?: string;
}

/**
 * GET /api/b2b/languages
 * Returns the languages enabled for this tenant's PIM catalog, ordered.
 * Proxies the suite admin endpoint (api-key auth) and trims it to the fields
 * the storefront language switcher needs. Fails soft to [] so the widget hides.
 */
export async function GET(req: NextRequest) {
  try {
    const config = await resolveTenantApiConfig(req);
    const base = (config.pimApiUrl || '').replace(/\/$/, '');
    if (!base) return NextResponse.json([] as EnabledLanguage[]);

    const response = await fetch(
      `${base}/api/admin/languages?status=enabled&limit=100&sortBy=order&sortOrder=asc`,
      {
        // Languages change rarely; cache briefly to avoid hammering the suite.
        next: { revalidate: 300 },
        headers: buildTenantApiHeaders(config, {
          includeLegacyApiKeyAlias: true,
        }),
      },
    );

    if (!response.ok) return NextResponse.json([] as EnabledLanguage[]);

    const data = (await response.json()) as {
      data?: Array<{ code?: string; name?: string; nativeName?: string }>;
    };

    const languages: EnabledLanguage[] = (data?.data || [])
      .filter((l) => typeof l?.code === 'string' && l.code.trim())
      .map((l) => ({
        code: String(l.code).trim().toLowerCase(),
        name: String(l.name ?? l.code).trim(),
        nativeName: l.nativeName ? String(l.nativeName).trim() : undefined,
      }));

    return NextResponse.json(languages);
  } catch {
    return NextResponse.json([] as EnabledLanguage[]);
  }
}
