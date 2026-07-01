import { NextRequest, NextResponse } from 'next/server';
import { buildTenantApiHeaders, resolveTenantApiConfig } from '@/lib/tenant';

/**
 * POST /api/b2b/cart/remove-items
 * Proxies to commerce-suite DELETE /api/b2b/orders/{id}/items with body.
 * Avoids the unreliable DELETE-with-body through the generic proxy.
 *
 * Body: { order_id: string, line_numbers: number[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, line_numbers, external_refs } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 },
      );
    }
    const hasLineNumbers =
      Array.isArray(line_numbers) && line_numbers.length > 0;
    const hasExternalRefs =
      Array.isArray(external_refs) && external_refs.length > 0;
    if (!hasLineNumbers && !hasExternalRefs) {
      return NextResponse.json(
        { error: 'line_numbers or external_refs array is required' },
        { status: 400 },
      );
    }

    const config = await resolveTenantApiConfig(req);
    const baseUrl = config.pimApiUrl.endsWith('/')
      ? config.pimApiUrl
      : `${config.pimApiUrl}/`;
    const targetUrl = new URL(`api/b2b/orders/${order_id}/items`, baseUrl);

    const authHeader = req.headers.get('Authorization');
    const headers = buildTenantApiHeaders(config, {
      authorization: authHeader,
      includeLegacyApiKeyAlias: true,
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'DELETE',
      headers,
      body: JSON.stringify(
        hasLineNumbers ? { line_numbers } : { external_refs },
      ),
    });

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
    const text = await response.text();
    return new NextResponse(text, { status: response.status });
  } catch (error) {
    console.error('[cart/remove-items] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
