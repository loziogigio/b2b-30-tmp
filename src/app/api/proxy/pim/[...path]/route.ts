import { privateStorefrontResponse } from '@/lib/security/private-response';
import { NextRequest, NextResponse } from 'next/server';
import { resolveStorefrontSession } from '@/lib/auth/storefront-session';
import {
  safeProxyPath,
  storefrontProxyAccess,
} from '@/lib/security/storefront-proxy-policy';
import { buildTenantApiHeaders, resolveTenantApiConfig } from '@/lib/tenant';
import { customerAddressCodes } from '@/lib/profile/session-owner';
import { getEntitledPromoCodes } from '@/lib/erp/customer-promos';
import { warnIfRedirectDroppedAuth } from '@/lib/tenant/auth-redirect-warning';
import {
  expandCategoryFilterToLeaves,
  type CategoryMap,
} from '@/lib/pim/category-filter';

// ---------------------------------------------------------------------------
// Category-tree cache (per tenant + upstream PIM URL).
// Used by category-search interception to expand non-leaf category_ancestors
// filters to their L3 leaf descendants — PIM products only carry their
// leaf in category_ancestors, so filtering by an L1/L2 id directly returns
// nothing. The tree comes from /api/b2b/pim/categories (admin endpoint that
// the same API key has access to).
// ---------------------------------------------------------------------------
const catCache = new Map<
  string,
  { map: CategoryMap; loadedAt: number; promise?: Promise<CategoryMap | null> }
>();
const CAT_CACHE_TTL_MS = 10 * 60 * 1000;
const CATEGORY_PAGE_SIZE = 200;
const MAX_CATEGORY_PAGES = 100;
const MAX_SEARCH_BODY_BYTES = 1024 * 1024;
// Upstream budgets. Search must stay snappy (the UI blocks on it). ELIA's
// assistant backend is allowed 30s of its own, so give it headroom rather than
// cutting it off early. Everything else (cart, orders, submit) gets a generous
// bound that only trips on a genuine hang.
const PIM_UPSTREAM_TIMEOUT_MS = 15_000;
const PIM_ELIA_TIMEOUT_MS = 35_000;
const PIM_DEFAULT_TIMEOUT_MS = 30_000;

function isEliaPath(pathString: string): boolean {
  return pathString === 'api/elia' || pathString.startsWith('api/elia/');
}

function upstreamTimeoutMs(pathString: string, searchPath: boolean): number {
  if (searchPath) return PIM_UPSTREAM_TIMEOUT_MS;
  if (isEliaPath(pathString)) return PIM_ELIA_TIMEOUT_MS;
  return PIM_DEFAULT_TIMEOUT_MS;
}
const PIM_PROXY_DEBUG = process.env.PIM_PROXY_DEBUG === 'true';

class RequestBodyTooLargeError extends Error {}

async function readRequestBody(
  req: NextRequest,
  maxBytes?: number,
): Promise<string> {
  if (maxBytes === undefined || !req.body) return req.text();

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // The size violation determines the response even if stream cleanup
        // fails after the limit has already been crossed.
      }
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function getCategoryMap(
  baseUrl: string,
  headers: Record<string, string>,
  tenantId: string,
): Promise<CategoryMap | null> {
  const key = `${tenantId}::${baseUrl}`;
  const entry = catCache.get(key);
  if (entry && Date.now() - entry.loadedAt < CAT_CACHE_TTL_MS) return entry.map;
  if (entry?.promise) return entry.promise;

  const promise = (async () => {
    try {
      const u = new URL('api/b2b/pim/categories', baseUrl);
      u.searchParams.set('limit', String(CATEGORY_PAGE_SIZE));
      const signal = AbortSignal.timeout(PIM_UPSTREAM_TIMEOUT_MS);
      const loadPage = async (page: number) => {
        u.searchParams.set('page', String(page));
        const resp = await fetch(u.toString(), {
          method: 'GET',
          headers,
          signal,
          redirect: 'error',
          cache: 'no-store',
        });
        if (!resp.ok) {
          throw new Error(`Category request failed (${resp.status})`);
        }
        return resp.json();
      };

      const firstPage = await loadPage(1);
      const reportedPageCount = Array.isArray(firstPage)
        ? 1
        : Number(firstPage?.pagination?.pages ?? 1);
      if (!Number.isSafeInteger(reportedPageCount) || reportedPageCount < 0) {
        throw new Error('Category response has invalid pagination');
      }
      // Suite reports zero pages for an empty result, but page one was still a
      // valid response and should be cached as an empty category map.
      const pageCount = Math.max(1, reportedPageCount);
      if (pageCount > MAX_CATEGORY_PAGES) {
        throw new Error('Category response exceeds the pagination safety cap');
      }

      const pages = [firstPage];
      for (let page = 2; page <= pageCount; page += 1) {
        pages.push(await loadPage(page));
      }
      const items: any[] = pages.flatMap((data) =>
        Array.isArray(data)
          ? data
          : data?.categories || data?.items || data?.data || [],
      );
      const map: CategoryMap = {};
      for (const c of items) {
        const rawId = c?.category_id || c?.id;
        if (!rawId) continue;
        const id = String(rawId);
        map[id] = {
          id,
          name: c.name,
          level: c.level,
          parent_id:
            c.parent_id === undefined || c.parent_id === null
              ? undefined
              : String(c.parent_id),
          path: Array.isArray(c.path) ? c.path.map(String) : [],
        };
      }
      catCache.set(key, { map, loadedAt: Date.now() });
      return map;
    } catch (err) {
      console.warn(
        '[PIM Proxy] categories cache load failed:',
        err instanceof Error ? err.name : 'UnknownError',
      );
      return null;
    }
  })();
  catCache.set(key, { map: {}, loadedAt: 0, promise });
  const map = await promise;
  if (!map) catCache.delete(key);
  return map;
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
  token: string;
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

async function resolveTrustedUserContext(
  req: NextRequest,
  expectedTenantId: string,
): Promise<TrustedUserContext | null> {
  const session = await resolveStorefrontSession(req, expectedTenantId);
  if (!session) return null;
  return {
    token: session.token,
    userId: session.user.id,
    userType:
      (session.user.customers?.length || 0) > 0 ? 'b2b_user' : 'portal_user',
    customers: (session.user.customers ?? [])
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
        signal: AbortSignal.timeout(PIM_UPSTREAM_TIMEOUT_MS),
        redirect: 'error',
        cache: 'no-store',
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

/**
 * Drops PROMOZIONE buckets the customer cannot receive.
 *
 * Solr's `promo_code` is populated from PIM `promotions[]`, which is
 * catalog-wide, so every customer is offered every campaign. The ERP knows
 * better: on 2026-09-08 customer 10407 was offered 4 buckets while entitled to
 * 2 — two campaigns covering 423 products they cannot get.
 *
 * `entitled === null` means the ERP could not answer. FAIL OPEN: filter
 * nothing. An empty Set is a real answer and does empty the facet.
 *
 * Counts are left alone — they are catalog-wide facts and stay true.
 */
export function filterPromoFacetByEntitlement(
  data: any,
  entitled: Set<string> | null,
): any {
  if (!entitled) return data;
  const facets = data?.data?.facet_results || data?.facet_results;
  const list = facets?.promo_code;
  if (!Array.isArray(list)) return data;
  facets.promo_code = list.filter((f: any) =>
    entitled.has(String(f?.value ?? '').trim()),
  );
  return data;
}

/** `lang` from a search body; the env default when absent or not JSON. */
export function readBodyLang(bodyText: string): string {
  const fallback = process.env.NEXT_PUBLIC_PIM_DEFAULT_LANG || 'it';
  try {
    const parsed = JSON.parse(bodyText);
    return typeof parsed?.lang === 'string' && parsed.lang.trim()
      ? parsed.lang.trim()
      : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The customer/address pair a SANITIZED search body carries. Empty for guests
 * and for a user with no owned selection — sanitizeSearchBody only writes the
 * pair back after the session has proven ownership of both halves.
 */
export function readTrustedPair(bodyText: string): {
  customerCode: string;
  addressCode: string;
} {
  try {
    const parsed = JSON.parse(bodyText);
    return {
      customerCode: String(parsed?.customer_code ?? '').trim(),
      addressCode: String(parsed?.address_code ?? '').trim(),
    };
  } catch {
    return { customerCode: '', addressCode: '' };
  }
}

/**
 * Everything the proxy does to a search response before returning it, as one
 * pure function so the INDEPENDENCE of the two steps is unit-tested: the
 * entitlement filter applies even when no promo_type facet came back.
 */
export function postProcessSearchResponse(
  data: any,
  opts: { promoMap: PromoMap; entitled: Set<string> | null },
): any {
  data = enrichPromoFacetLabels(data, opts.promoMap);
  return filterPromoFacetByEntitlement(data, opts.entitled);
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
  const pathString = safeProxyPath(path);
  const access = pathString && storefrontProxyAccess(pathString, method);
  if (!pathString || !access) {
    return NextResponse.json(
      { error: 'Endpoint not available to storefront' },
      { status: 403 },
    );
  }

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
  if (targetUrl.origin !== new URL(baseUrl).origin) {
    return NextResponse.json(
      { error: 'Invalid upstream path' },
      { status: 403 },
    );
  }

  // Forward query params
  req.nextUrl.searchParams.forEach((value: string, key: string) => {
    targetUrl.searchParams.set(key, value);
  });

  const searchPath = isSearchPath(pathString);
  const trustedUserContext =
    access === 'session' || isUserContextPath(pathString) || searchPath
      ? await resolveTrustedUserContext(req, config.tenantId)
      : null;

  if (access === 'session' && !trustedUserContext) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

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
  const bearerToken = trustedUserContext?.token;
  const headers = buildTenantApiHeaders(config, {
    authorization: bearerToken ? `Bearer ${bearerToken}` : null,
    includeLegacyApiKeyAlias: true,
  });
  if (trustedUserContext) {
    attachTrustedUserContext(headers, trustedUserContext);
  }

  // The upstream timeout is armed right before dispatch (below), not here:
  // reading the body and expanding the category tree can themselves take
  // seconds and must not eat into the budget of the request they prepare.
  const fetchOptions: RequestInit = {
    method,
    headers,
    redirect: 'error',
    cache: 'no-store',
  };

  // Forward body for POST/PUT/PATCH/DELETE
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const declaredLength = Number(req.headers.get('content-length'));
    if (
      searchPath &&
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_SEARCH_BODY_BYTES
    ) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 },
      );
    }

    try {
      let bodyText = await readRequestBody(
        req,
        searchPath ? MAX_SEARCH_BODY_BYTES : undefined,
      );
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
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json(
          { error: 'Request body too large' },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }
  }

  try {
    if (PIM_PROXY_DEBUG) {
      // Keep request bodies and query values out of normal production logs.
      console.log(`[PIM Proxy] ${method} ${targetUrl.pathname}`);
    }

    fetchOptions.signal = AbortSignal.any([
      req.signal,
      AbortSignal.timeout(upstreamTimeoutMs(pathString, searchPath)),
    ]);
    const response = await fetch(targetUrl.toString(), fetchOptions);

    warnIfRedirectDroppedAuth(
      response,
      targetUrl.toString(),
      Boolean(bearerToken),
    );

    if (PIM_PROXY_DEBUG) {
      console.log(`[PIM Proxy] Response: ${response.status}`);
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      let data = await response.json();

      // Search responses get two INDEPENDENT post-processing steps:
      //   1. facet_results.promo_type labels harvested from promotions[] — only
      //      worth a harvest when that facet is actually in the response;
      //   2. facet_results.promo_code trimmed to the customer's entitlement.
      // (2) must not live inside (1)'s guard: the storefront sidebar requests
      // promo_code but never promo_type, so that guard is normally closed —
      // and the entitlement filter never ran in production (2026-09-09).
      if (method === 'POST' && response.ok && searchPath) {
        const bodyText =
          typeof fetchOptions.body === 'string' ? fetchOptions.body : '';

        const promoTypeFacet =
          data?.data?.facet_results?.promo_type ||
          data?.facet_results?.promo_type;
        let promoMap: PromoMap = {};
        if (Array.isArray(promoTypeFacet) && promoTypeFacet.length > 0) {
          const proxyHeaders = buildTenantApiHeaders(config, {
            contentType: false,
            includeLegacyApiKeyAlias: true,
          });
          promoMap = await getPromoTypeMap(
            baseUrl,
            proxyHeaders,
            readBodyLang(bodyText),
            config.tenantId,
          );
        }

        // Entitlement comes off the SANITIZED body: sanitizeSearchBody has
        // already replaced the browser's hint with the SSO-owned pair, so a
        // spoofed customer_code can never widen what this viewer sees.
        const { customerCode, addressCode } = readTrustedPair(bodyText);
        const entitled =
          customerCode && addressCode
            ? await getEntitledPromoCodes({
                req,
                tenantId: config.tenantId,
                customerCode,
                addressCode,
              })
            : null;

        data = postProcessSearchResponse(data, { promoMap, entitled });
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
    const timedOut =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError') &&
      !req.signal.aborted;
    console.error(
      '[PIM Proxy] upstream request failed:',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return NextResponse.json(
      { error: timedOut ? 'Upstream timeout' : 'Proxy error' },
      { status: timedOut ? 504 : 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return privateStorefrontResponse(await proxyRequest(req, params, 'GET'));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return privateStorefrontResponse(await proxyRequest(req, params, 'POST'));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return privateStorefrontResponse(await proxyRequest(req, params, 'PUT'));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return privateStorefrontResponse(await proxyRequest(req, params, 'PATCH'));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return privateStorefrontResponse(await proxyRequest(req, params, 'DELETE'));
}

// Explicitly deny HEAD: Next otherwise invokes GET and dispatches credentials.
export async function HEAD() {
  return privateStorefrontResponse(new NextResponse(null, { status: 405 }));
}

export async function OPTIONS() {
  return privateStorefrontResponse(new NextResponse(null, { status: 405 }));
}
