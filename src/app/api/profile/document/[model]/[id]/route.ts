import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import { isProfileModel, fetchModelRecord } from '@/lib/profile/vinc-data-models';
import { sessionOwnedCustomerCodes } from '@/lib/profile/session-owner';

type RouteParams = { params: Promise<{ model: string; id: string }> };

const FILE_FIELD: Record<string, string> = {
  pdf: 'pdf_url',
  barcode: 'pdf_barcode_url',
  csv: 'csv_url',
};

function isHttpUrl(u: unknown): u is string {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

/**
 * The public /documenti-clienti route is closed (403). Fetch via the internal
 * overlay (DOCUMENTI_CLIENTI_BASE, e.g. http://vinc-tunnelgw:28000) which serves
 * from the file ROOT — so the /documenti-clienti prefix must be STRIPPED.
 * URL.pathname normalizes encoding (spaces → %20). Falls back to the original
 * URL when no base is configured.
 */
function resolveFetchUrl(u: string): string {
  const base = process.env.DOCUMENTI_CLIENTI_BASE;
  if (!base) return u;
  const { pathname } = new URL(u);
  const marker = '/documenti-clienti';
  const i = pathname.indexOf(marker);
  const rel = i >= 0 ? pathname.slice(i + marker.length) : pathname;
  return `${base.replace(/\/+$/, '')}${rel}`;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { model, id } = await params;
  if (!isProfileModel(model)) {
    return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 404 });
  }

  const field = FILE_FIELD[req.nextUrl.searchParams.get('kind') ?? 'pdf'];
  if (!field) {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
  }

  // 1) session → owned customer codes (server-derived; never trusts the client)
  const owned = await sessionOwnedCustomerCodes(req);
  if (!owned) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  // 2) load the record (server-side api-key)
  const creds = await resolveCsCreds(req);
  let rec: any;
  try {
    rec = await fetchModelRecord(creds, model, id);
  } catch (error) {
    console.error(`[document broker] ${model}/${id} record fetch failed:`, error);
    return NextResponse.json({ error: 'record fetch failed' }, { status: 502 });
  }
  if (!rec) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // 3) ownership gate
  if (!rec.relation_id || !owned.has(String(rec.relation_id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 4) resolve + validate the file url
  const fileUrl = rec.data?.[field];
  if (!isHttpUrl(fileUrl)) {
    return NextResponse.json({ error: 'document not available' }, { status: 404 });
  }

  // 5) stream the file back (pass through type/length; propagate 404)
  try {
    const upstream = await fetch(resolveFetchUrl(fileUrl));
    if (upstream.status === 404) {
      return NextResponse.json({ error: 'document not found' }, { status: 404 });
    }
    if (!upstream.ok || !upstream.body) {
      console.error(`[document broker] upstream ${upstream.status} for ${model}/${id}`);
      return NextResponse.json({ error: 'document unavailable' }, { status: 502 });
    }
    const filename = (fileUrl.split('/').pop() || `${model}-${id}`).split('?')[0];
    const headers: Record<string, string> = {
      'content-type':
        upstream.headers.get('content-type') ??
        (field === 'csv_url' ? 'text/csv' : 'application/pdf'),
      'content-disposition': `inline; filename="${decodeURIComponent(filename)}"`,
      'cache-control': 'private, no-store',
    };
    const len = upstream.headers.get('content-length');
    if (len) headers['content-length'] = len;
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error(`[document broker] stream failed for ${model}/${id}:`, error);
    return NextResponse.json({ error: 'document unavailable' }, { status: 502 });
  }
}
