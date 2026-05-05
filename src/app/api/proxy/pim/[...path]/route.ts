import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

// ---------------------------------------------------------------------------
// Category-tree cache (per upstream PIM URL).
// Used by category-search interception to expand non-leaf category_ancestors
// filters to their L3 leaf descendants — PIM products only carry their
// leaf in category_ancestors, so filtering by an L1/L2 id directly returns
// nothing. The tree comes from /api/b2b/pim/categories (admin endpoint that
// the same API key has access to).
// ---------------------------------------------------------------------------
type CatNode = {
  id: string;
  name?: string;
  level?: number;
  parent_id?: string;
  path?: string[];
};
type CatMap = Record<string, CatNode>;
const catCache = new Map<
  string,
  { map: CatMap; loadedAt: number; promise?: Promise<CatMap | null> }
>();
const CAT_CACHE_TTL_MS = 10 * 60 * 1000;

async function getCategoryMap(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<CatMap | null> {
  const key = baseUrl;
  const entry = catCache.get(key);
  if (entry && Date.now() - entry.loadedAt < CAT_CACHE_TTL_MS) return entry.map;
  if (entry?.promise) return entry.promise;

  const promise = (async () => {
    try {
      const u = new URL('api/b2b/pim/categories', baseUrl);
      u.searchParams.set('limit', '2000');
      const resp = await fetch(u.toString(), { method: 'GET', headers });
      if (!resp.ok) return null;
      const data = await resp.json();
      const items: any[] = Array.isArray(data)
        ? data
        : data?.categories || data?.items || data?.data || [];
      const map: CatMap = {};
      for (const c of items) {
        const id = c?.category_id || c?.id;
        if (!id) continue;
        map[id] = {
          id,
          name: c.name,
          level: c.level,
          parent_id: c.parent_id,
          path: Array.isArray(c.path) ? c.path : [],
        };
      }
      catCache.set(key, { map, loadedAt: Date.now() });
      return map;
    } catch (err) {
      console.warn('[PIM Proxy] categories cache load failed:', err);
      return null;
    }
  })();
  catCache.set(key, { map: {}, loadedAt: 0, promise });
  return promise;
}

// Drill-down dedup: drop ancestors when a descendant is also selected,
// then expand each remaining id to its L3 leaf descendants.
function expandCategoryFilterToLeaves(
  ids: string[] | string,
  catMap: CatMap,
): string[] {
  const list = (Array.isArray(ids) ? ids : [ids]).map(String);

  const ancestorsOf = (id: string) => catMap[id]?.path || [];
  const kept = list.filter((id) => {
    const others = list.filter((o) => o !== id);
    return !others.some((o) => ancestorsOf(o).includes(id));
  });

  let childrenIndex: Map<string, CatNode[]> | null = null;
  const buildIndex = () => {
    childrenIndex = new Map();
    for (const c of Object.values(catMap)) {
      if (!c?.parent_id) continue;
      const arr = childrenIndex!.get(c.parent_id) || [];
      arr.push(c);
      childrenIndex!.set(c.parent_id, arr);
    }
  };
  const out = new Set<string>();
  const collect = (id: string) => {
    const meta = catMap[id];
    if (!meta) {
      out.add(id);
      return;
    }
    if (meta.level === 3) {
      out.add(id);
      return;
    }
    if (!childrenIndex) buildIndex();
    const kids = childrenIndex!.get(id) || [];
    if (!kids.length) {
      out.add(id);
      return;
    }
    for (const k of kids) collect(k.id);
  };
  for (const id of kept) collect(id);
  return Array.from(out);
}

// Rewrite a /api/search/search request body so non-leaf category_ancestors
// filters get expanded to their leaves. Returns the (possibly rewritten)
// JSON string, or the original text when no expansion is needed.
async function maybeExpandSearchBody(
  bodyText: string,
  baseUrl: string,
  headers: Record<string, string>,
): Promise<string> {
  let body: any;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
  const ca = body?.filters?.category_ancestors;
  if (!ca) return bodyText;
  const catMap = await getCategoryMap(baseUrl, headers);
  if (!catMap) return bodyText;
  body.filters.category_ancestors = expandCategoryFilterToLeaves(ca, catMap);
  return JSON.stringify(body);
}

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

  // Forward body for POST/PUT/PATCH/DELETE
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      let bodyText = await req.text();
      if (bodyText) {
        // For category-aware search calls, rewrite filters.category_ancestors
        // so non-leaf ids (L1/L2) get expanded to their L3 leaf descendants.
        // Products only carry leaves on category_ancestors, so without this
        // expansion clicking a parent category narrows to nothing.
        if (
          method === 'POST' &&
          (pathString === 'api/search/search' ||
            pathString.endsWith('/search/search'))
        ) {
          const proxyHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          };
          if (config.apiKeyId) proxyHeaders['X-API-Key'] = config.apiKeyId;
          if (config.apiSecret) proxyHeaders['X-API-Secret'] = config.apiSecret;
          bodyText = await maybeExpandSearchBody(
            bodyText,
            baseUrl,
            proxyHeaders,
          );
        }
        fetchOptions.body = bodyText;
      }
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
