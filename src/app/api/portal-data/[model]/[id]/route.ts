import { NextResponse, type NextRequest } from 'next/server';
import { resolveStorefrontSession } from '@/lib/auth/storefront-session';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import { privateStorefrontRoute } from '@/lib/security/private-response';
import {
  assertOwned,
  assertSameOrigin,
  BffError,
  bffErrorResponse,
  buildUpstreamQuery,
  callPortalData,
  PORTAL_MODEL_RE,
  PORTAL_RECORD_ID_RE,
  readScriptToken,
  readWriteBody,
  toScriptRecord,
  upstreamError,
} from '@/lib/portal-data/bff';

type RouteParams = { params: Promise<{ model: string; id: string }> };

async function handle(
  req: NextRequest,
  model: string,
  id: string,
  method: 'GET' | 'PATCH',
): Promise<NextResponse> {
  try {
    if (!PORTAL_MODEL_RE.test(model) || !PORTAL_RECORD_ID_RE.test(id))
      throw new BffError(404, 'NOT_FOUND', 'Record not found');
    assertSameOrigin(req);
    const token = readScriptToken(req);
    const session = await resolveStorefrontSession(req);
    if (!session)
      throw new BffError(401, 'NOT_AUTHENTICATED', 'Authentication required');
    const query = buildUpstreamQuery(req, session);
    const body = method === 'PATCH' ? await readWriteBody(req) : undefined;
    const creds = await resolveCsCreds(req);
    const upstream = await callPortalData(
      creds,
      session,
      token,
      `${model}/records/${id}`,
      { method, query, body },
    );
    if (upstream.status >= 400) throw upstreamError(upstream);
    const record = upstream.body?.record;
    if (!record)
      throw new BffError(502, 'UPSTREAM_ERROR', 'Malformed upstream response');
    assertOwned(
      session,
      upstream.body?.model?.relation,
      [record],
      query.get('customer_code'),
    );
    return NextResponse.json({ record: toScriptRecord(record) });
  } catch (error) {
    if (error instanceof BffError) return bffErrorResponse(error);
    console.error('[portal-data record route]', error);
    return bffErrorResponse(
      new BffError(502, 'UPSTREAM_ERROR', 'Portal data request failed'),
    );
  }
}

export const GET = privateStorefrontRoute(
  async (req: NextRequest, { params }: RouteParams) => {
    const { model, id } = await params;
    return handle(req, model, id, 'GET');
  },
);
export const PATCH = privateStorefrontRoute(
  async (req: NextRequest, { params }: RouteParams) => {
    const { model, id } = await params;
    return handle(req, model, id, 'PATCH');
  },
);
