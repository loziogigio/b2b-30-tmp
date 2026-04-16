import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

const DEFAULT_PIM_API_URL =
  process.env.PIM_API_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';
const PIM_API_URL_OVERRIDE = process.env.PIM_API_URL_OVERRIDE;
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

async function getTenantConfig(req: NextRequest) {
  if (isSingleTenant) {
    return {
      pimApiUrl: DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
    };
  }
  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname);
  if (!tenant) {
    return {
      pimApiUrl: DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
    };
  }
  return {
    pimApiUrl:
      PIM_API_URL_OVERRIDE || tenant.api.pimApiUrl || DEFAULT_PIM_API_URL,
    apiKeyId: tenant.api.apiKeyId || DEFAULT_API_KEY_ID,
    apiSecret: tenant.api.apiSecret || DEFAULT_API_SECRET,
  };
}

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

    const config = await getTenantConfig(req);
    const baseUrl = config.pimApiUrl.endsWith('/')
      ? config.pimApiUrl
      : `${config.pimApiUrl}/`;
    const targetUrl = new URL(`api/b2b/orders/${order_id}`, baseUrl);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (config.apiKeyId) headers['X-API-Key'] = config.apiKeyId;
    if (config.apiSecret) headers['X-API-Secret'] = config.apiSecret;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

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
