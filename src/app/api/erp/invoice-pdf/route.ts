import { NextRequest, NextResponse } from 'next/server';
import { ArxivarClient } from 'vinc-erp';
import { getMyMbErpClient } from '@/lib/erp/factory';
import { resolveArxivarConfig } from '@/lib/erp/arxivar-config';
import { sessionOwnedCustomerCodes } from '@/lib/profile/session-owner';
import { toErpNumericDate } from '@utils/date-to-erp';

/**
 * Standard error envelope for this route: a stable machine `code` plus a
 * human-readable Italian `message` (the storefront is IT). The PDF opens in a
 * new tab, so the message is what a user could see directly.
 */
function errorJson(
  httpStatus: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ status: 'error', code, message }, { status: httpStatus });
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams;
  const customerCode = q.get('customer_code') ?? '';
  const addressCode = q.get('address_code') ?? '';
  const year = q.get('year') ?? '';
  const number = q.get('number') ?? '';

  if (!customerCode || !year || !number) {
    return errorJson(400, 'missing_parameters', 'Parametri della fattura mancanti.');
  }

  // 1. Session must own the requested customer.
  const owned = await sessionOwnedCustomerCodes(req);
  if (!owned || owned.size === 0) {
    return errorJson(401, 'not_authenticated', 'Sessione non valida. Effettua di nuovo l’accesso.');
  }
  if (!owned.has(customerCode.trim())) {
    return errorJson(403, 'forbidden', 'Non autorizzato ad accedere a questo documento.');
  }

  // 2. The specific invoice must belong to this customer — re-derived server-side,
  //    never trusted from the client. Re-fetch the customer-scoped invoice list
  //    for the invoice's year and confirm the (year, number) is present.
  let matchedInvoice: any;
  try {
    const erp = await getMyMbErpClient(req);
    const yearNum = Number(year);
    // toErpNumericDate takes an ISO "YYYY-MM-DD" string (see src/utils/date-to-erp.ts
    // and every other call site), not a Date object — pass ISO strings for the
    // invoice year's full-year window.
    const invoices = await erp.getInvoices({
      customerCode,
      addressCode: addressCode || undefined,
      dateFrom: toErpNumericDate(`${yearNum}-01-01`),
      dateTo: toErpNumericDate(`${yearNum}-12-31`),
    });
    const matched = Array.isArray(invoices)
      ? invoices.find(
          (r: any) =>
            String(r?.year) === String(year) &&
            String(r?.number) === String(number),
        )
      : undefined;
    if (!matched) {
      return errorJson(403, 'forbidden', 'Non autorizzato ad accedere a questo documento.');
    }
    matchedInvoice = matched;
  } catch (err) {
    console.error('[invoice-pdf] ownership check failed:', err);
    return errorJson(
      502,
      'erp_unreachable',
      'Impossibile verificare il documento in questo momento. Riprova più tardi.',
    );
  }

  // 3. Fetch + decode + stream.
  const cfg = await resolveArxivarConfig(req);
  if (!cfg.enabled || !cfg.baseUrl) {
    return errorJson(
      503,
      'archive_not_configured',
      'Servizio archivio documenti non configurato.',
    );
  }

  let base64: string | null;
  try {
    const client = new ArxivarClient({
      baseUrl: cfg.baseUrl,
      authHeader: cfg.authHeader,
    });
    base64 = await client.getInvoicePdf({
      cause: matchedInvoice?.scope || 'VEN',
      year,
      number,
      docType: matchedInvoice?.type ?? undefined,
    });
  } catch (err) {
    // Transport/HTTP error talking to the archive — the document may well exist,
    // the service is just unreachable. Distinct from "not archived".
    console.error('[invoice-pdf] ArxivarIX request failed:', err);
    return errorJson(
      502,
      'archive_unreachable',
      'Servizio archivio documenti temporaneamente non disponibile. Riprova più tardi.',
    );
  }

  // The invoice exists in the ERP but has no PDF archived in ArxivarIX (yet).
  const pdf = base64 ? Buffer.from(base64, 'base64') : null;
  if (!pdf || pdf.length === 0) {
    return errorJson(
      404,
      'document_not_available',
      'Documento non ancora disponibile in archivio.',
    );
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="fattura-${year}-${number}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
