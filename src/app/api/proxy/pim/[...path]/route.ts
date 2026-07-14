import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIES, resolveAuthContext } from '@/lib/auth/server';
import { buildTenantApiHeaders, resolveTenantApiConfig } from '@/lib/tenant';
import { customerAddressCodes } from '@/lib/profile/session-owner';

// ---------------------------------------------------------------------------
// Category-tree cache (per tenant + upstream PIM URL).
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
  tenantId: string,
): Promise<CatMap | null> {
  const key = `${tenantId}::${baseUrl}`;
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

// ---------------------------------------------------------------------------
// promo_type label cache (keyed by tenant + upstream PIM URL + lang).
// The PIM facet for `promo_type` ships the bare code (e.g. "LIP") with no
// friendly label. Products carry `promotions[].label` / `.name` (e.g. "LIFE
// IN POOL"), so we harvest a code → label map by scanning a small page of
// promoted products and cache it for 10 minutes per (tenant, lang).
// Mirrors dfl-b2b/server/api/pim-search.js#getPromoTypeMap.
// ---------------------------------------------------------------------------
type PromoMap = Record<string, string>;
type PromoCacheEntry = {
  map: PromoMap;
  loadedAt: number;
  promise?: Promise<PromoMap>;
};
const promoCache = new Map<string, PromoCacheEntry>();
const PROMO_MAP_TTL_MS = 10 * 60 * 1000;
const PROMO_HARVEST_ROWS = 50;

type TrustedUserContext = {
  userId: string;
  userType: 'b2b_user' | 'portal_user';
  customers: Array<{
    customerCode: string;
    addressCodes: Set<string>;
  }>;
};

function isUserContextPath(pathString: string): boolean {
  return (
    pathString === 'api/b2b/likes' ||
    pathString.startsWith('api/b2b/likes/') ||
    pathString === 'api/b2b/reminders' ||
    pathString.startsWith('api/b2b/reminders/')
  );
}

function isSearchPath(pathString: string): boolean {
  return (
    pathString === 'api/search/search' || pathString.endsWith('/search/search')
  );
}

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return token && token !== 'null' ? token : null;
  }

  const token = req.cookies.get(AUTH_COOKIES.ACCESS_TOKEN)?.value?.trim();
  return token && token !== 'null' ? token : null;
}

async function resolveTrustedUserContext(
  req: NextRequest,
  expectedTenantId: string,
): Promise<TrustedUserContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const authContext = await resolveAuthContext(req, 'pim-proxy');
    if (!authContext.success) return null;

    const validation = await authContext.context.ssoApi.validate(token);
    const authenticated = validation.authenticated ?? validation.active;
    const tenantId = validation.tenant_id || authContext.context.tenantId;
    const userId = validation.user?.id || validation.sub;

    if (!authenticated || tenantId !== expectedTenantId || !userId) {
      return null;
    }

    return {
      userId,
      userType:
        (validation.user?.customers?.length || 0) > 0
          ? 'b2b_user'
          : 'portal_user',
      customers: (validation.user?.customers ?? [])
        .filter(
          (customer) =>
            typeof customer.erp_customer_id === 'string' &&
            customer.erp_customer_id.length > 0,
        )
        .map((customer) => ({
          customerCode: customer.erp_customer_id,
          addressCodes: customerAddressCodes(customer),
        })),
    };
  } catch (err) {
    console.warn(
      '[PIM Proxy] user context validation failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function attachTrustedUserContext(
  headers: Record<string, string>,
  userContext: TrustedUserContext,
): void {
  headers['x-user-id'] = userContext.userId;
  headers['x-user-type'] = userContext.userType;

  // Backward-compatible alias consumed by older commerce-suite API-key flows.
  if (userContext.userType === 'b2b_user') {
    headers['x-customer-id'] = userContext.userId;
  }
}

type TrustedSearchSelection =
  | {
      allowed: true;
      authenticated: boolean;
      customerCode?: string;
      addressCode?: string;
    }
  | { allowed: false };

/**
 * Treat the browser-provided pair only as a selection hint. It becomes trusted
 * customer context after the SSO-validated session proves ownership of both
 * the customer and address. Anonymous/expired sessions remain guest searches.
 */
function resolveTrustedSearchSelection(
  userContext: TrustedUserContext | null,
  requestedCustomer: unknown,
  requestedAddress: unknown,
): TrustedSearchSelection {
  const customerCode =
    typeof requestedCustomer === 'string' ? requestedCustomer.trim() : '';
  const addressCode =
    typeof requestedAddress === 'string' ? requestedAddress.trim() : '';

  if (!userContext) {
    return { allowed: true, authenticated: false };
  }

  const ownedCustomer = customerCode
    ? userContext.customers.find(
        (customer) => customer.customerCode === customerCode,
      )
    : undefined;

  if (customerCode && !ownedCustomer) return { allowed: false };
  if (
    addressCode &&
    (!ownedCustomer || !ownedCustomer.addressCodes.has(addressCode))
  ) {
    return { allowed: false };
  }

  // Customer-specific inline pricing requires a complete, owned pair. A valid
  // user with no active selection is authenticated but receives no price tier.
  if (ownedCustomer && addressCode) {
    return {
      allowed: true,
      authenticated: true,
      customerCode: ownedCustomer.customerCode,
      addressCode,
    };
  }

  return { allowed: true, authenticated: true };
}

function sanitizeSearchBody(
  bodyText: string,
  userContext: TrustedUserContext | null,
): { allowed: true; bodyText: string } | { allowed: false } {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return { allowed: true, bodyText };
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { allowed: true, bodyText };
  }

  const selection = resolveTrustedSearchSelection(
    userContext,
    body.customer_code,
    body.address_code,
  );
  if (!selection.allowed) return selection;

  // These fields affect private visibility or customer-specific price tiers;
  // never forward their raw browser values.
  delete body.customer_code;
  delete body.address_code;
  delete body.authenticated;
  delete body.tag_filter;

  if (selection.authenticated) body.authenticated = true;
  if (selection.customerCode && selection.addressCode) {
    body.customer_code = selection.customerCode;
    body.address_code = selection.addressCode;
  }

  return { allowed: true, bodyText: JSON.stringify(body) };
}

function sanitizeSearchQuery(
  url: URL,
  userContext: TrustedUserContext | null,
): boolean {
  const selection = resolveTrustedSearchSelection(
    userContext,
    url.searchParams.get('customer_code'),
    url.searchParams.get('address_code'),
  );
  if (!selection.allowed) return false;

  url.searchParams.delete('customer_code');
  url.searchParams.delete('address_code');
  url.searchParams.delete('authenticated');
  url.searchParams.delete('tag_filter');

  if (selection.authenticated) url.searchParams.set('authenticated', 'true');
  if (selection.customerCode && selection.addressCode) {
    url.searchParams.set('customer_code', selection.customerCode);
    url.searchParams.set('address_code', selection.addressCode);
  }

  return true;
}

async function getPromoTypeMap(
  baseUrl: string,
  headers: Record<string, string>,
  lang: string,
  tenantId: string,
): Promise<PromoMap> {
  const cacheKey = `${tenantId}::${baseUrl}::${lang}`;
  const entry = promoCache.get(cacheKey);
  if (entry && Date.now() - entry.loadedAt < PROMO_MAP_TTL_MS) return entry.map;
  if (entry?.promise) return entry.promise;

  const promise = (async () => {
    const map: PromoMap = {};
    try {
      const url = new URL('api/search/search', baseUrl);
      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          rows: PROMO_HARVEST_ROWS,
          filters: { has_active_promo: true },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const docs: any[] = data?.data?.results || data?.results || [];
        for (const doc of docs) {
          const proms = Array.isArray(doc?.promotions) ? doc.promotions : [];
          for (const p of proms) {
            const code = p?.promo_type;
            const label = p?.label || p?.name;
            if (code && label && !map[code]) map[code] = label;
          }
        }
      }
    } catch (err) {
      console.warn('[PIM Proxy] promo-type map load failed:', err);
    }
    promoCache.set(cacheKey, { map, loadedAt: Date.now() });
    return map;
  })();
  promoCache.set(cacheKey, { map: {}, loadedAt: 0, promise });
  return promise;
}

// Rewrites facet_results.promo_type entries in-place so the sidebar renders
// "GIORNALINO SUPERPREZZI" instead of the bare "SPR" code. Both `label` and
// `entity.label` are populated so consumers that read either path get the
// friendly title.
function enrichPromoFacetLabels(data: any, promoMap: PromoMap): any {
  if (!promoMap || Object.keys(promoMap).length === 0) return data;
  const facets = data?.data?.facet_results || data?.facet_results;
  const list = facets?.promo_type;
  if (!Array.isArray(list)) return data;
  for (const f of list) {
    const code = String(f?.value ?? '');
    const friendly = promoMap[code];
    if (!friendly) continue;
    f.label = friendly;
    if (!f.entity || typeof f.entity !== 'object') f.entity = {};
    if (!f.entity.label) f.entity.label = friendly;
  }
  return data;
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
  tenantId: string,
): Promise<string> {
  let body: any;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
  const ca = body?.filters?.category_ancestors;
  if (!ca) return bodyText;
  const catMap = await getCategoryMap(baseUrl, headers, tenantId);
  if (!catMap) return bodyText;
  body.filters.category_ancestors = expandCategoryFilterToLeaves(ca, catMap);
  return JSON.stringify(body);
}

async function proxyRequest(
  req: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string,
) {
  const { path } = await params;
  const pathString = path.join('/');

  // Resolve the PIM API target + credentials via the shared helper so every
  // route reaches the suite the same way (honours PIM_API_URL_OVERRIDE).
  const config = await resolveTenantApiConfig(req);

  if (!config.pimApiUrl) {
    console.error('[PIM Proxy] PIM API URL not configured');
    return NextResponse.json(
      { error: 'Proxy error', message: 'PIM API not configured' },
      { status: 500 },
    );
  }

  // Ensure base URL ends with /
  const baseUrl = config.pimApiUrl.endsWith('/')
    ? config.pimApiUrl
    : `${config.pimApiUrl}/`;
  const targetUrl = new URL(pathString, baseUrl);

  // Forward query params
  req.nextUrl.searchParams.forEach((value: string, key: string) => {
    targetUrl.searchParams.set(key, value);
  });

  const searchPath = isSearchPath(pathString);
  const trustedUserContext =
    isUserContextPath(pathString) || searchPath
      ? await resolveTrustedUserContext(req, config.tenantId)
      : null;

  if (
    searchPath &&
    method === 'GET' &&
    !sanitizeSearchQuery(targetUrl, trustedUserContext)
  ) {
    return NextResponse.json(
      { error: 'Forbidden customer context' },
      { status: 403 },
    );
  }

  // Forward the validated user's JWT for Suite-side defense in depth. Browser
  // sessions normally carry it in an httpOnly cookie rather than a header.
  const bearerToken = getBearerToken(req);
  const headers = buildTenantApiHeaders(config, {
    authorization: bearerToken ? `Bearer ${bearerToken}` : null,
    includeLegacyApiKeyAlias: true,
  });
  if (trustedUserContext) {
    attachTrustedUserContext(headers, trustedUserContext);
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
        if (method === 'POST' && searchPath) {
          const sanitized = sanitizeSearchBody(bodyText, trustedUserContext);
          if (!sanitized.allowed) {
            return NextResponse.json(
              { error: 'Forbidden customer context' },
              { status: 403 },
            );
          }
          bodyText = sanitized.bodyText;
        }

        // For category-aware search calls, rewrite filters.category_ancestors
        // so non-leaf ids (L1/L2) get expanded to their L3 leaf descendants.
        // Products only carry leaves on category_ancestors, so without this
        // expansion clicking a parent category narrows to nothing.
        if (method === 'POST' && searchPath) {
          const proxyHeaders = buildTenantApiHeaders(config, {
            includeLegacyApiKeyAlias: true,
          });
          bodyText = await maybeExpandSearchBody(
            bodyText,
            baseUrl,
            proxyHeaders,
            config.tenantId,
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
      let data = await response.json();

      // For search responses, enrich facet_results.promo_type with friendly
      // labels harvested from promotions[]. PIM ships the raw codes (SPR /
      // ZZZ / LIP) but products carry the human title — same approach as
      // dfl-b2b/server/api/pim-search.
      if (method === 'POST' && response.ok && searchPath) {
        const promoFacet =
          data?.data?.facet_results?.promo_type ||
          data?.facet_results?.promo_type;
        if (Array.isArray(promoFacet) && promoFacet.length > 0) {
          const proxyHeaders = buildTenantApiHeaders(config, {
            contentType: false,
            includeLegacyApiKeyAlias: true,
          });
          // Honour the lang the caller requested so the promo titles match
          // the rest of the response (falls back to env / 'it').
          let lang = process.env.NEXT_PUBLIC_PIM_DEFAULT_LANG || 'it';
          try {
            if (typeof fetchOptions.body === 'string') {
              const parsed = JSON.parse(fetchOptions.body);
              if (typeof parsed?.lang === 'string' && parsed.lang.trim()) {
                lang = parsed.lang.trim();
              }
            }
          } catch {
            // body wasn't JSON — keep default lang
          }
          const promoMap = await getPromoTypeMap(
            baseUrl,
            proxyHeaders,
            lang,
            config.tenantId,
          );
          data = enrichPromoFacetLabels(data, promoMap);
        }
      }

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
