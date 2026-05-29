import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

type SubmitBody = {
  pageSlug?: string;
  formBlockId?: string;
  data?: Record<string, unknown>;
};

// Single-tenant fallbacks from .env — multi-tenant gets these from the DB
// per request hostname.
const DEFAULT_BASE =
  process.env.PIM_API_PRIVATE_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';
const DEFAULT_KEY_ID = process.env.API_KEY_ID || '';
const DEFAULT_SECRET = process.env.API_SECRET || '';

async function getSuiteConfig(req: NextRequest) {
  if (isSingleTenant) {
    return {
      base: DEFAULT_BASE,
      keyId: DEFAULT_KEY_ID,
      secret: DEFAULT_SECRET,
    };
  }
  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname).catch(() => null);
  return {
    base: tenant?.api.pimApiUrl || DEFAULT_BASE,
    keyId: tenant?.api.apiKeyId || DEFAULT_KEY_ID,
    secret: tenant?.api.apiSecret || DEFAULT_SECRET,
  };
}

export async function POST(req: NextRequest): Promise<Response> {
  const { base, keyId, secret } = await getSuiteConfig(req);

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
