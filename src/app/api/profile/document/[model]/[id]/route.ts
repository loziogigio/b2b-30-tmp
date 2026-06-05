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

// Internal overlay that serves the documenti-clienti files (the public route is
// closed). Defaults so prod works with no extra config; override with
// DOCUMENTI_CLIENTI_BASE for other environments (e.g. a local SSH tunnel →
// http://localhost:28000).
const DEFAULT_DOCUMENTI_CLIENTI_BASE = 'http://vinc-tunnelgw:28000';

/**
 * Build the server-side fetch URL. We always go through the overlay base and
 * keep ONLY the record's path after `/documenti-clienti` (the overlay serves
 * from the file root) — so the record's host is never fetched, and the
 * `/documenti-clienti` prefix is stripped. URL.pathname normalizes encoding
 * (spaces → %20).
 */
function resolveFetchUrl(u: string): string {
  const base =
    process.env.DOCUMENTI_CLIENTI_BASE || DEFAULT_DOCUMENTI_CLIENTI_BASE;
  const { pathname } = new URL(u);
  const marker = '/documenti-clienti';
  const i = pathname.indexOf(marker);
  const rel = i >= 0 ? pathname.slice(i + marker.length) : pathname;
  return `${base.replace(/\/+$/, '')}${rel}`;
}

/**
 * This route is opened in a browser tab (the documents page links to it), so
 * errors render as a small friendly HTML page rather than raw JSON. The success
 * case streams the PDF inline.
 */
function errorPage(status: number, icon: string, title: string, message: string) {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title><style>
:root{color-scheme:light}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;color:#111827;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:36px 30px;max-width:400px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.ic{font-size:44px;line-height:1;margin-bottom:14px}
h1{font-size:18px;margin:0 0 8px;font-weight:600}
p{font-size:14px;color:#6b7280;margin:0;line-height:1.5}
</style></head><body><div class="card"><div class="ic">${icon}</div><h1>${title}</h1><p>${message}</p></div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

const PAGES = {
  unauthenticated: () =>
    errorPage(
      401,
      '🔒',
      'Accesso richiesto',
      'La tua sessione è scaduta. Effettua di nuovo l’accesso per visualizzare il documento.',
    ),
  forbidden: () =>
    errorPage(
      403,
      '🔒',
      'Accesso negato',
      'Non sei autorizzato a visualizzare questo documento.',
    ),
  notAvailable: () =>
    errorPage(
      404,
      '📄',
      'Documento non disponibile',
      'Il documento richiesto non è disponibile.',
    ),
  unavailable: () =>
    errorPage(
      502,
      '📄',
      'Documento non disponibile',
      'Il documento non è ancora disponibile.',
    ),
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { model, id } = await params;
  if (!isProfileModel(model)) return PAGES.notAvailable();

  const field = FILE_FIELD[req.nextUrl.searchParams.get('kind') ?? 'pdf'];
  if (!field) return PAGES.notAvailable();

  // 1) session → owned customer codes (server-derived; never trusts the client)
  const owned = await sessionOwnedCustomerCodes(req);
  if (!owned) return PAGES.unauthenticated();

  // 2) load the record (server-side api-key)
  const creds = await resolveCsCreds(req);
  let rec: any;
  try {
    rec = await fetchModelRecord(creds, model, id);
  } catch (error) {
    console.error(`[document broker] ${model}/${id} record fetch failed:`, error);
    return PAGES.unavailable();
  }
  if (!rec) return PAGES.notAvailable();

  // 3) ownership gate
  if (!rec.relation_id || !owned.has(String(rec.relation_id))) {
    return PAGES.forbidden();
  }

  // 4) resolve + validate the file url (must be an http(s) documenti-clienti file)
  const fileUrl = rec.data?.[field];
  if (!isHttpUrl(fileUrl) || !fileUrl.includes('/documenti-clienti/')) {
    return PAGES.notAvailable();
  }

  // 5) stream the file back (pass through type/length; propagate 404)
  try {
    const upstream = await fetch(resolveFetchUrl(fileUrl));
    if (upstream.status === 404) return PAGES.notAvailable();
    if (!upstream.ok || !upstream.body) {
      console.error(`[document broker] upstream ${upstream.status} for ${model}/${id}`);
      return PAGES.unavailable();
    }
    const filename = (fileUrl.split('/').pop() || `${model}-${id}`)
      .split('?')[0]
      .replace(/[\r\n"]/g, '');
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
    return PAGES.unavailable();
  }
}
