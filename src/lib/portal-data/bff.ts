/**
 * Portal-script data BFF helpers. The Commerce Suite is the authority; these
 * checks are defence in depth (spec §5.8): same-origin, script token shape,
 * body limits, session-owned customer/address, and an ownership re-check of
 * everything CS returns before it reaches the browser.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { StorefrontSession } from '@/lib/auth/storefront-session';
import type { CsCreds } from '@/lib/profile/cs-creds';
import { STOREFRONT_CHANNEL } from '@/lib/security/storefront-channel';
import { buildTenantApiHeaders } from '@/lib/tenant/api-headers';

export const SCRIPT_TOKEN_HEADER = 'x-vinc-script-token';
export const PORTAL_MODEL_RE = /^[a-z][a-z0-9_]{0,39}$/;
export const PORTAL_RECORD_ID_RE = /^[a-f0-9]{24}$/;
export const MAX_BODY_BYTES = 66 * 1024;
const TOKEN_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const FILTER_RE = /^filter\[[a-z][a-z0-9_]*\](\[(in|gte|lte|gt|lt|ne)\])?$/;
const PASSTHROUGH = new Set([
  'page',
  'limit',
  'sort',
  'customer_code',
  'address_code',
]);
const UPSTREAM_TIMEOUT_MS = 10_000;

export class BffError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: unknown,
    public readonly retryAfter?: string | null,
  ) {
    super(message);
    this.name = 'BffError';
  }
}

export function bffErrorResponse(error: BffError): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    },
    {
      status: error.status,
      headers: error.retryAfter
        ? { 'Retry-After': error.retryAfter }
        : undefined,
    },
  );
}

/** Browsers always send these on fetch; anything cross-site is refused. */
export function assertSameOrigin(req: NextRequest): void {
  const site = req.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin')
    throw new BffError(403, 'FORBIDDEN', 'Cross-site request refused');
  const origin = req.headers.get('origin');
  if (origin !== null) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new BffError(403, 'FORBIDDEN', 'Cross-site request refused');
    }
    const requestHost = req.headers.get('host') ?? req.nextUrl.host;
    if (originHost !== requestHost)
      throw new BffError(403, 'FORBIDDEN', 'Cross-site request refused');
  }
}

export function readScriptToken(req: NextRequest): string {
  const token = req.headers.get(SCRIPT_TOKEN_HEADER);
  if (!token || token.length > 2048 || !TOKEN_RE.test(token)) {
    throw new BffError(401, 'SCRIPT_TOKEN_INVALID', 'Script token required');
  }
  return token;
}

/** Writes must be JSON, at most 66 KB, and exactly { data: … }. */
export async function readWriteBody(
  req: NextRequest,
): Promise<{ data: unknown }> {
  if (!/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) {
    throw new BffError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
  }
  if (Number(req.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) {
    throw new BffError(413, 'PAYLOAD_TOO_LARGE', 'Body too large');
  }
  const text = await req.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES)
    throw new BffError(413, 'PAYLOAD_TOO_LARGE', 'Body too large');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new BffError(400, 'INVALID_REQUEST', 'Body must be JSON');
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => key !== 'data')
  ) {
    throw new BffError(
      400,
      'INVALID_REQUEST',
      'Body must be { "data": { … } }',
    );
  }
  return { data: (body as { data?: unknown }).data };
}

/** Allowlisted query, session-owned customer/address, channel forced server-side. */
export function buildUpstreamQuery(
  req: NextRequest,
  session: StorefrontSession,
): URLSearchParams {
  const sp = req.nextUrl.searchParams;
  const out = new URLSearchParams();
  for (const key of new Set(sp.keys())) {
    if (sp.getAll(key).length !== 1)
      throw new BffError(400, 'INVALID_REQUEST', 'Duplicate query parameter');
    // A filter the Suite can't apply must fail loudly, never return unfiltered data.
    if (key.startsWith('filter[') && !FILTER_RE.test(key)) {
      throw new BffError(400, 'INVALID_REQUEST', `Unsupported filter "${key}"`);
    }
    if (PASSTHROUGH.has(key) || FILTER_RE.test(key)) out.set(key, sp.get(key)!);
  }
  const customerCode = out.get('customer_code');
  const addressCode = out.get('address_code');
  const customer = customerCode
    ? (session.user.customers ?? []).find(
        (entry) => entry?.erp_customer_id === customerCode,
      )
    : undefined;
  if (customerCode && !customer)
    throw new BffError(
      403,
      'FORBIDDEN',
      'Customer not available to this session',
    );
  if (
    addressCode &&
    !(customer?.addresses ?? []).some(
      (address) => address?.erp_address_id === addressCode,
    )
  ) {
    throw new BffError(
      403,
      'FORBIDDEN',
      'Address not available to this session',
    );
  }
  out.set('channel', STOREFRONT_CHANNEL);
  return out;
}

export interface UpstreamResult {
  status: number;
  body: any;
  retryAfter: string | null;
}

export async function callPortalData(
  creds: CsCreds,
  session: StorefrontSession,
  token: string,
  path: string,
  init: { method: string; query: URLSearchParams; body?: { data: unknown } },
): Promise<UpstreamResult> {
  if (!creds.csBaseUrl || !creds.apiKeyId || !creds.apiSecret) {
    throw new BffError(502, 'UPSTREAM_ERROR', 'Portal data is not configured');
  }
  const url = `${creds.csBaseUrl.replace(/\/+$/, '')}/api/b2b/portal-data/${path}?${init.query}`;
  const res = await fetch(url, {
    method: init.method,
    headers: {
      ...buildTenantApiHeaders(creds, {
        authorization: `Bearer ${session.token}`,
      }),
      [SCRIPT_TOKEN_HEADER]: token,
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  }).catch(() => null);
  if (!res)
    throw new BffError(
      502,
      'UPSTREAM_ERROR',
      'Portal data service unreachable',
    );
  const body = await res.json().catch(() => null);
  return {
    status: res.status,
    body,
    retryAfter: res.headers.get('retry-after'),
  };
}

/** Structured CS errors pass through; boundary strings and 5xx are normalized. */
export function upstreamError(result: UpstreamResult): BffError {
  if (result.status >= 500)
    return new BffError(502, 'UPSTREAM_ERROR', 'Portal data request failed');
  const error = result.body?.error;
  if (error && typeof error === 'object' && typeof error.code === 'string') {
    return new BffError(
      result.status,
      error.code,
      String(error.message ?? 'Request failed'),
      error.fields,
      result.retryAfter,
    );
  }
  const code =
    result.status === 401
      ? 'NOT_AUTHENTICATED'
      : result.status === 404
        ? 'NOT_FOUND'
        : result.status === 400
          ? 'INVALID_REQUEST'
          : 'FORBIDDEN';
  return new BffError(
    result.status,
    code,
    typeof error === 'string' ? error : 'Request failed',
    undefined,
    result.retryAfter,
  );
}

/** Every record must belong to this session before anything reaches the browser. */
export function assertOwned(
  session: StorefrontSession,
  relation: unknown,
  records: unknown[],
  customerCode: string | null,
): void {
  for (const record of records) {
    const relationId = (record as { relation_id?: unknown } | null)
      ?.relation_id;
    const owned =
      relation === 'portal_user'
        ? relationId === session.user.id
        : relation === 'customer' &&
          typeof relationId === 'string' &&
          relationId === customerCode &&
          (session.user.customers ?? []).some(
            (customer) => customer?.erp_customer_id === relationId,
          );
    if (!owned) {
      console.error(
        '[portal-data] upstream returned a record outside the session',
      );
      throw new BffError(502, 'UPSTREAM_ERROR', 'Portal data request failed');
    }
  }
}

export function toScriptRecord(record: any) {
  return {
    id: record.id,
    data: record.data ?? {},
    ...(record.customer_code ? { customer_code: record.customer_code } : {}),
    ...(record.address_code ? { address_code: record.address_code } : {}),
    ...(record.created_at ? { created_at: record.created_at } : {}),
    ...(record.updated_at ? { updated_at: record.updated_at } : {}),
    created_by_me: record.created_by_me === true,
  };
}
