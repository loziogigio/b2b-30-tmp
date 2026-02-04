import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

// Default values from .env (used in single-tenant mode)
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';

// Local dev override - set in .env.local to override tenant config from MongoDB
const PIM_API_URL_OVERRIDE = process.env.PIM_API_URL_OVERRIDE;

const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

/**
 * Get tenant configuration for this request
 * - Single-tenant mode: returns .env values
 * - Multi-tenant mode: resolves tenant from hostname header
 */
async function getTenantConfig(req: NextRequest) {
  if (isSingleTenant) {
    return {
      pimApiUrl: DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
    };
  }

  // Multi-tenant: resolve from hostname
  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname);

  if (!tenant) {
    console.warn(`[PIM Proxy] No tenant found for hostname: ${hostname}`);
    // Fallback to .env values
    return {
      pimApiUrl: DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
    };
  }

  // Log tenant config for debugging
  if (!tenant.api.pimApiUrl) {
    console.warn(
      `[PIM Proxy] Tenant ${tenant.id} missing pimApiUrl, using default`,
    );
  }
  if (!tenant.api.apiKeyId || !tenant.api.apiSecret) {
    console.warn(`[PIM Proxy] Tenant ${tenant.id} missing API credentials`);
  }

  return {
    // PIM_API_URL_OVERRIDE takes precedence (for local dev)
    pimApiUrl:
      PIM_API_URL_OVERRIDE || tenant.api.pimApiUrl || DEFAULT_PIM_API_URL,
    apiKeyId: tenant.api.apiKeyId || DEFAULT_API_KEY_ID,
    apiSecret: tenant.api.apiSecret || DEFAULT_API_SECRET,
  };
}

async function proxyRequest(
  req: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string,
) {
  const { path } = await params;
  const pathString = path.join('/');

  // Get tenant-specific configuration
  const config = await getTenantConfig(req);

  // Ensure base URL ends with /
  const baseUrl = config.pimApiUrl.endsWith('/')
    ? config.pimApiUrl
    : `${config.pimApiUrl}/`;
  const targetUrl = new URL(pathString, baseUrl);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Inject API credentials server-side (not exposed to client)
  if (config.apiKeyId) {
    headers['X-API-Key'] = config.apiKeyId;
  }
  if (config.apiSecret) {
    headers['X-API-Secret'] = config.apiSecret;
  }

  // Forward user's JWT if present (for user-specific requests)
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Forward body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      fetchOptions.body = await req.text();
    } catch {
      // No body
    }
  }

  try {
    // Log the request
    console.log(`[PIM Proxy] ${method} ${targetUrl.toString()}`);
    if (fetchOptions.body) {
      console.log(`[PIM Proxy] Body: ${fetchOptions.body}`);
    }

    const response = await fetch(targetUrl.toString(), fetchOptions);

    // Log the response status
    console.log(
      `[PIM Proxy] Response: ${response.status} ${response.statusText}`,
    );

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: { 'Content-Type': contentType || 'text/plain' },
      });
    }
  } catch (error) {
    console.error('[PIM Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy error', message: (error as Error).message },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, params, 'GET');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, params, 'POST');
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, params, 'PUT');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, params, 'PATCH');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, params, 'DELETE');
}
