import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

// Default values from .env (used in single-tenant mode)
const DEFAULT_B2B_API_URL =
  process.env.B2B_API_URL ||
  process.env.NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT ||
  'http://localhost:8000/api/v1';

/**
 * Get tenant configuration for this request
 * - Single-tenant mode: returns .env values
 * - Multi-tenant mode: resolves tenant from hostname header
 */
async function getTenantConfig(req: NextRequest) {
  if (isSingleTenant) {
    return {
      b2bApiUrl: DEFAULT_B2B_API_URL,
    };
  }

  // Multi-tenant: resolve from hostname
  const hostname = req.headers.get('x-tenant-hostname') || req.headers.get('host') || 'localhost';
  const tenant = await resolveTenant(hostname);

  if (!tenant) {
    console.warn(`[B2B Proxy] No tenant found for hostname: ${hostname}`);
    // Fallback to .env values
    return {
      b2bApiUrl: DEFAULT_B2B_API_URL,
    };
  }

  // Log tenant config for debugging
  if (!tenant.api.b2bApiUrl) {
    console.warn(`[B2B Proxy] Tenant ${tenant.id} missing b2bApiUrl, using default`);
  }

  return {
    b2bApiUrl: tenant.api.b2bApiUrl || DEFAULT_B2B_API_URL,
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
  const baseUrl = config.b2bApiUrl.endsWith('/')
    ? config.b2bApiUrl
    : `${config.b2bApiUrl}/`;
  const targetUrl = new URL(pathString, baseUrl);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Forward user's JWT for authentication
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

  // Log the request
  console.log(`[B2B Proxy] ${method} ${targetUrl.toString()}`);
  if (fetchOptions.body) {
    console.log(`[B2B Proxy] Body: ${fetchOptions.body}`);
  }

  try {
    const response = await fetch(targetUrl.toString(), fetchOptions);

    // Log the response status
    console.log(`[B2B Proxy] Response: ${response.status} ${response.statusText}`);

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
    console.error('[B2B Proxy] Error:', error);
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
