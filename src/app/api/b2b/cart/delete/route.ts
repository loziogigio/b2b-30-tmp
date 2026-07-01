import { NextRequest, NextResponse } from 'next/server';
import { buildTenantApiHeaders, resolveTenantApiConfig } from '@/lib/tenant';

/**
 * POST /api/b2b/cart/delete
 * Proxies to commerce-suite DELETE /api/b2b/orders/{id}.
 *
 * Body: { order_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 },
      );
    }

    const config = await resolveTenantApiConfig(req);
    const baseUrl = config.pimApiUrl.endsWith('/')
      ? config.pimApiUrl
      : `${config.pimApiUrl}/`;
    const targetUrl = new URL(`api/b2b/orders/${order_id}`, baseUrl);

    const authHeader = req.headers.get('Authorization');
    const headers = buildTenantApiHeaders(config, {
      authorization: authHeader,
      includeLegacyApiKeyAlias: true,
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'DELETE',
      headers,
    });

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
    const text = await response.text();
    return new NextResponse(text, { status: response.status });
  } catch (error) {
    console.error('[cart/delete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
