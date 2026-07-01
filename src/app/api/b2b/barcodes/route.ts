import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import { buildTenantApiHeaders } from '@/lib/tenant';

/**
 * Resolve EAN/barcode for a set of ERP entity codes from PIM.
 *
 * POST { entity_codes: string[] } → { barcodes: { [entity_code]: string } }
 *
 * The PIM search payload is large (full products), so we keep it server-side
 * and return only the compact entity_code → barcode map. Mirrors the PIM proxy
 * auth against tenant.api.pimApiUrl.
 */
const CHUNK = 200;

function normalizeEan(ean: unknown): string {
  const v = Array.isArray(ean) ? ean[0] : ean;
  return v == null ? '' : String(v).trim();
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const codes: string[] = Array.isArray(body?.entity_codes)
    ? [
        ...new Set(
          body.entity_codes.map((c: unknown) => String(c)).filter(Boolean),
        ),
      ]
    : [];

  if (codes.length === 0) {
    return NextResponse.json({ barcodes: {} });
  }

  const creds = await resolveCsCreds(req);
  const pimBase = (process.env.PIM_API_URL_OVERRIDE || creds.csBaseUrl || '')
    .toString()
    .replace(/\/+$/, '');

  if (!pimBase || !creds.apiKeyId) {
    return NextResponse.json({ barcodes: {} });
  }

  const headers = buildTenantApiHeaders(creds, {
    includeLegacyApiKeyAlias: true,
  });

  const barcodes: Record<string, string> = {};

  try {
    for (let i = 0; i < codes.length; i += CHUNK) {
      const slice = codes.slice(i, i + CHUNK);
      const res = await fetch(`${pimBase}/api/search/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lang: 'it',
          rows: slice.length,
          filters: { entity_code: slice },
        }),
      });
      if (!res.ok) continue;
      const json: any = await res.json();
      // PIM search shape: { success, data: { results: Product[], numFound } }
      const products: any[] = Array.isArray(json?.data?.results)
        ? json.data.results
        : Array.isArray(json?.data?.products)
          ? json.data.products
          : Array.isArray(json?.results)
            ? json.results
            : [];
      for (const p of products) {
        const code = String(p?.entity_code ?? p?.id ?? '');
        const ean = normalizeEan(p?.ean);
        if (code && ean) barcodes[code] = ean;
      }
    }
  } catch (error) {
    console.error('[b2b/barcodes] PIM lookup failed:', error);
    return NextResponse.json({ barcodes }, { status: 200 });
  }

  return NextResponse.json({ barcodes });
}
