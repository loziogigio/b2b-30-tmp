import { NextRequest, NextResponse } from 'next/server';
import { parseMyMbConnection } from 'vinc-erp';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';
import { resolveErpUrl } from '@/lib/erp/factory';

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
  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
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
    console.warn(
      `[B2B Proxy] Tenant ${tenant.id} missing b2bApiUrl, using default`,
    );
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

  // Resolve the MyMB/B2B base URL the SAME way the ERP client does for order
  // list (ERP_URL_OVERRIDE → tenant b2bApiUrl → ERP_URL). This keeps every
  // B2B-proxy call pointed at the same service order list uses and honours the
  // dev override; in prod (no override) it falls back to the tenant URL.
  let resolvedUrl = config.b2bApiUrl;
  try {
    resolvedUrl = resolveErpUrl(config.b2bApiUrl);
  } catch {
    // No ERP override/base configured — keep the resolved b2bApiUrl as-is.
  }

  // If the resolved URL embeds credentials (e.g. a MyMB connection string
  // `http://user:pass@host/...`), Node's fetch() rejects the URL. Strip the
  // credentials into an `Authorization: Basic` header and use the clean base
  // URL — same handling as the ERP client (parseMyMbConnection).
  let apiUrl = resolvedUrl;
  let basicAuthHeader: string | undefined;
  try {
    if (new URL(resolvedUrl).username) {
      const conn = parseMyMbConnection(resolvedUrl);
      apiUrl = conn.baseUrl;
      basicAuthHeader = conn.authHeader;
    }
  } catch {
    // Not a parseable URL with credentials — use it as-is.
  }

  // Ensure base URL ends with /
  const baseUrl = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
  const targetUrl = new URL(pathString, baseUrl);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Basic auth derived from a credentialed B2B URL takes precedence; otherwise
  // forward the user's JWT for authentication.
  if (basicAuthHeader) {
    headers['Authorization'] = basicAuthHeader;
  } else {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Forward body for POST/PUT/PATCH/DELETE
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
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
    console.log(
      `[B2B Proxy] Response: ${response.status} ${response.statusText}`,
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
