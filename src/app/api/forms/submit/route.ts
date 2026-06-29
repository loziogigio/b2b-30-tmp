import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantApiConfig } from '@/lib/tenant';

type SubmitBody = {
  pageSlug?: string;
  formBlockId?: string;
  data?: Record<string, unknown>;
};

export async function POST(req: NextRequest): Promise<Response> {
  const {
    pimApiUrl: base,
    apiKeyId: keyId,
    apiSecret: secret,
  } = await resolveTenantApiConfig(req);

  if (!base || !keyId || !secret) {
    return NextResponse.json(
      { error: 'Submit credentials not configured' },
      { status: 503 },
    );
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pageSlug, formBlockId, data } = body;
  if (!pageSlug || !formBlockId || !data || typeof data !== 'object') {
    return NextResponse.json(
      { error: 'pageSlug, formBlockId, and data are required' },
      { status: 400 },
    );
  }

  const origin =
    req.headers.get('origin') ||
    req.headers.get('referer') ||
    `https://${req.headers.get('host') ?? 'localhost'}`;

  let suiteRes: Response;
  try {
    suiteRes = await fetch(`${base}/api/b2b/b2b/public/forms/submit`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key-id': keyId,
        'x-api-secret': secret,
        origin,
      },
      body: JSON.stringify({
        page_slug: pageSlug,
        form_block_id: formBlockId,
        data,
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Submit upstream unreachable: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const text = await suiteRes.text();
  return new Response(text, {
    status: suiteRes.status,
    headers: {
      'content-type':
        suiteRes.headers.get('content-type') ?? 'application/json',
    },
  });
}
