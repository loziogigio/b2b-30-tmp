import { NextRequest, NextResponse } from 'next/server';
import { ArxivarClient } from 'vinc-erp';
import { getMyMbErpClient } from '@/lib/erp/factory';
import { resolveArxivarConfig } from '@/lib/erp/arxivar-config';
import { sessionOwnedCustomerCodes } from '@/lib/profile/session-owner';
import { toErpNumericDate } from '@utils/date-to-erp';

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams;
  const customerCode = q.get('customer_code') ?? '';
  const addressCode = q.get('address_code') ?? '';
  const year = q.get('year') ?? '';
  const number = q.get('number') ?? '';

  if (!customerCode || !year || !number) {
    return NextResponse.json(
      { status: 'error', message: 'Missing invoice identifiers' },
      { status: 400 },
    );
  }

  // 1. Session must own the requested customer.
  const owned = await sessionOwnedCustomerCodes(req);
  if (!owned || owned.size === 0) {
    return NextResponse.json(
      { status: 'error', message: 'Not authenticated' },
      { status: 401 },
    );
  }
  if (!owned.has(customerCode.trim())) {
    return NextResponse.json(
      { status: 'error', message: 'Forbidden' },
      { status: 403 },
    );
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
      return NextResponse.json(
        { status: 'error', message: 'Forbidden' },
        { status: 403 },
      );
    }
    matchedInvoice = matched;
  } catch (err) {
    console.error('[invoice-pdf] ownership check failed:', err);
    return NextResponse.json(
      { status: 'error', message: 'Upstream error' },
      { status: 502 },
    );
  }

  // 3. Fetch + decode + stream.
  const cfg = await resolveArxivarConfig(req);
  if (!cfg.enabled || !cfg.baseUrl) {
    return NextResponse.json(
      { status: 'error', message: 'Invoice archive not configured' },
      { status: 404 },
    );
  }
  try {
    const client = new ArxivarClient({
      baseUrl: cfg.baseUrl,
      authHeader: cfg.authHeader,
    });
    const base64 = await client.getInvoicePdf({
      cause: matchedInvoice?.scope || 'VEN',
      year,
      number,
      docType: matchedInvoice?.type ?? undefined,
    });
    const pdf = Buffer.from(base64, 'base64');
    if (pdf.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Empty document' },
        { status: 404 },
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
  } catch (err) {
    console.error('[invoice-pdf] ArxivarIX fetch failed:', err);
    return NextResponse.json(
      { status: 'error', message: 'Document not found' },
      { status: 404 },
    );
  }
}
