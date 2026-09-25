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
  readScriptToken,
  readWriteBody,
  toScriptRecord,
  upstreamError,
} from '@/lib/portal-data/bff';

type RouteParams = { params: Promise<{ model: string }> };

async function handle(
  req: NextRequest,
  model: string,
  method: 'GET' | 'POST',
): Promise<NextResponse> {
  try {
    if (!PORTAL_MODEL_RE.test(model))
      throw new BffError(404, 'NOT_FOUND', 'Unknown data model');
    assertSameOrigin(req);
    const token = readScriptToken(req);
    const session = await resolveStorefrontSession(req);
    if (!session)
      throw new BffError(401, 'NOT_AUTHENTICATED', 'Authentication required');
    const query = buildUpstreamQuery(req, session);
    const body = method === 'POST' ? await readWriteBody(req) : undefined;
    const creds = await resolveCsCreds(req);
    const upstream = await callPortalData(
      creds,
      session,
      token,
      `${model}/records`,
      { method, query, body },
    );
    if (upstream.status >= 400) throw upstreamError(upstream);

    const relation = upstream.body?.model?.relation;
    if (method === 'GET') {
      const items = upstream.body?.items;
      if (!Array.isArray(items))
        throw new BffError(
          502,
          'UPSTREAM_ERROR',
          'Malformed upstream response',
        );
      assertOwned(session, relation, items, query.get('customer_code'));
      return NextResponse.json({
        items: items.map(toScriptRecord),
        pagination: upstream.body.pagination,
      });
    }
    const record = upstream.body?.record;
    if (!record)
      throw new BffError(502, 'UPSTREAM_ERROR', 'Malformed upstream response');
    assertOwned(session, relation, [record], query.get('customer_code'));
    return NextResponse.json(
      { record: toScriptRecord(record) },
      { status: upstream.status === 201 ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof BffError) return bffErrorResponse(error);
    console.error('[portal-data route]', error);
    return bffErrorResponse(
      new BffError(502, 'UPSTREAM_ERROR', 'Portal data request failed'),
    );
  }
}

export const GET = privateStorefrontRoute(
  async (req: NextRequest, { params }: RouteParams) =>
    handle(req, (await params).model, 'GET'),
);
export const POST = privateStorefrontRoute(
  async (req: NextRequest, { params }: RouteParams) =>
    handle(req, (await params).model, 'POST'),
);
