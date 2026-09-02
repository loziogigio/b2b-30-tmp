import { NextRequest, NextResponse } from 'next/server';
import { CouponClient } from 'vinc-erp';
import { getMyMbErpClient } from '@/lib/erp/factory';
import { resolveCouponConfig } from '@/lib/erp/coupon-config';
import {
  buildOrderDetailResponse,
  buildOrderDetailResponseFromDocRows,
} from '@utils/transform/erp-order-detail';
import { mapErpDocRowsToLines } from '@utils/transform/erp-document-lines';
import { mapErpLatestOrderRows } from '@utils/transform/erp-latest-order';
import { sessionOwnedCustomerCodes } from '@/lib/profile/session-owner';

type RouteParams = { params: Promise<{ path: string[] }> };

const COUPON_ENDPOINTS = new Set([
  'validate_coupon',
  'check_coupon_cart',
  'submit_coupon',
  'verify_promo_item',
]);

/**
 * MyMB's coupon webservice resolves the customer with TO_NUMBER(codiceInternoCliente)
 * (an Oracle proc), so it needs the bare numeric ERP id — the storefront's
 * customer_code carries a prefix (e.g. "B_10080"). Strip to digits; fall back to
 * the raw value if there are none.
 */
function erpCustomerCode(value: unknown): string {
  const raw = String(value ?? '');
  const digits = raw.replace(/\D/g, '');
  return digits || raw;
}

async function handleCoupon(
  endpoint: string,
  body: any,
  req: NextRequest,
): Promise<NextResponse> {
  const cfg = await resolveCouponConfig(req);
  if (!cfg.enabled || !cfg.baseUrl) {
    return NextResponse.json({
      status: 'error',
      message: 'Coupons not enabled',
    });
  }
  const client = new CouponClient({
    baseUrl: cfg.baseUrl,
    authHeader: cfg.authHeader,
  });
  const cliente = erpCustomerCode(body.codiceInternoCliente);

  // Call descriptor the order sync uses to apply the coupon onto the MyMB
  // document (UpdateTestataDocumentoConCoupon). `idElaborazione` is left null —
  // the sync fills it with the order's erp_cart_id. No url/auth here: the
  // Windmill worker calls the INTERNAL ERP service with its own credentials.
  const buildApply = (codiceCoupon: string) => ({
    method: 'GET' as const,
    params: { codiceCoupon, idElaborazione: null as string | null },
  });

  switch (endpoint) {
    case 'validate_coupon': {
      const data = await client.validateCoupon(cliente, body.codiceCoupon);
      return NextResponse.json({
        status: 'success',
        data,
        apply: buildApply(body.codiceCoupon),
      });
    }
    case 'check_coupon_cart': {
      const info = await client.getCartCoupon(body.id_cart);
      const codice = info?.GetInfoCouponFromDocumentoResult?.m_Item2?.Codice;
      if (!codice) {
        return NextResponse.json({
          status: 'error',
          message: 'No coupon on cart',
        });
      }
      const data = await client.validateCoupon(cliente, codice);
      return NextResponse.json({
        status: 'success',
        data,
        apply: buildApply(codice),
      });
    }
    case 'submit_coupon': {
      const data = await client.submitCoupon(
        body.idElaborazione,
        body.codiceCoupon,
      );
      return NextResponse.json({ status: 'success', data });
    }
    case 'verify_promo_item': {
      // dataPrezzatura (DDMMYYYY) + valuta are required by MyMB; the client
      // defaults them to today/EUR when the body omits them.
      const data = await client.verifyPromoItem(
        cliente,
        body.codiceIndirizzo,
        body.codiceInternoArticolo,
        body.dataPrezzatura,
        body.valuta,
      );
      return NextResponse.json({ status: 'success', data });
    }
    default:
      return NextResponse.json(
        { status: 'error', message: `Unknown coupon endpoint: ${endpoint}` },
        { status: 404 },
      );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const endpoint = path.join('/');

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // This route holds the tenant's server-side ERP credentials, so a browser
  // request must never be enough on its own to reach MyMB. Validate the SSO
  // session and, whenever a customer code is supplied, ensure it belongs to
  // that session instead of trusting the request body.
  const ownedCustomerCodes = await sessionOwnedCustomerCodes(req);
  if (!ownedCustomerCodes) {
    return NextResponse.json(
      { status: 'error', message: 'Unauthorized' },
      { status: 401 },
    );
  }
  if (ownedCustomerCodes.size === 0) {
    return NextResponse.json(
      { status: 'error', message: 'No ERP customer assigned' },
      { status: 403 },
    );
  }

  const requestedCustomerCode = String(
    body.customer_code ?? body.codiceInternoCliente ?? '',
  ).trim();
  if (requestedCustomerCode && !ownedCustomerCodes.has(requestedCustomerCode)) {
    return NextResponse.json(
      { status: 'error', message: 'Forbidden customer' },
      { status: 403 },
    );
  }

  if (COUPON_ENDPOINTS.has(endpoint)) {
    try {
      return await handleCoupon(endpoint, body, req);
    } catch (error) {
      console.error(`[ERP route] coupon ${endpoint} failed:`, error);
      return NextResponse.json(
        { status: 'error', message: (error as Error).message },
        { status: 502 },
      );
    }
  }

  try {
    const client = await getMyMbErpClient(req);

    switch (endpoint) {
      case 'get_multiple_prices': {
        const priceReq = {
          customerCode: body.customer_code,
          addressCode: body.address_code,
          entityCodes: body.entity_codes ?? [],
          quantityList: body.quantity_list,
          idCart: body.id_cart,
        };
        const data = await client.getMultiplePrices(priceReq);
        return NextResponse.json({ status: 'success', data });
      }
      case 'get_orders': {
        const data = await client.getOrders({
          customerCode: body.customer_code,
          addressCode: body.address_code,
          type: body.type,
          dateFrom: body.date_from,
          dateTo: body.date_to,
          customerRef: body.cust_rif ?? body.customer_ref,
        });
        return NextResponse.json({ status: 'success', data });
      }
      case 'get_order_detail': {
        // MyMB has no single-order detail endpoint: find the order in the same
        // GetTestateConInfoConsegna list order-list uses, then read its
        // IDCarrello rows via GetRigheCarrello. Returns the RawOrderResponse
        // shape (success/message) that fetchOrderDetails → transformOrder eats.
        const orders = await client.getOrders({
          customerCode: body.customer_code,
          addressCode: body.address_code,
          type: body.type,
          dateFrom: body.date_from,
          dateTo: body.date_to,
          customerRef: body.cust_rif ?? body.customer_ref,
        });
        const num = String(body.NumeroDocDefinitivo ?? body.doc_number ?? '');
        const cau = String(body.CausaleDocDefinitivo ?? body.cause ?? '');
        const anno = String(body.AnnoDocDefinitivo ?? body.doc_year ?? '');
        const testata = (orders ?? []).find(
          (o: any) =>
            String(o.NumeroDocDefinitivo) === num &&
            String(o.CausaleDocDefinitivo) === cau &&
            String(o.AnnoDocDefinitivo) === anno,
        );
        if (!testata) {
          return NextResponse.json(
            { success: false, message: 'Order not found.' },
            { status: 404 },
          );
        }
        // Web-created orders carry a usable IDCarrello → GetRigheCarrello.
        // Historical/ERP-native orders (e.g. B05) never had a web cart, so
        // that returns nothing — read the rows straight off the document via
        // GetRigheConInfoConsegna instead.
        const idCart = Number(testata.IDCarrello) || 0;
        const righe = idCart > 0 ? await client.getCartRows(idCart) : [];
        if (righe.length > 0) {
          return NextResponse.json(buildOrderDetailResponse(testata, righe));
        }
        const docRows = await client.getOrderRows({
          cause: cau,
          year: anno,
          number: num,
        });
        return NextResponse.json(
          buildOrderDetailResponseFromDocRows(testata, docRows),
        );
      }
      case 'get_document_rows': {
        // Per-line rows for an invoice (F) or DDT, for the time-theme
        // documents page's barcode/CSV export. MyMB has no legacy hub here;
        // read straight off the document via GetRigheFATT/DDTConInfo, then
        // map to the DocumentLine[] documents-export.ts consumes.
        const docType = body.doc_type === 'DDT' ? 'DDT' : 'F';
        const rows = await client.getDocumentRows({
          cause: String(
            body.CausaleDocDefinitivo ?? body.cause ?? body.scope ?? '',
          ),
          year: String(
            body.AnnoDocDefinitivo ?? body.doc_year ?? body.year ?? '',
          ),
          number: String(
            body.NumeroDocDefinitivo ?? body.doc_number ?? body.number ?? '',
          ),
          docType,
        });
        return NextResponse.json({
          status: 'success',
          data: mapErpDocRowsToLines(rows),
        });
      }
      case 'get_latest_order_by_item': {
        // This customer's order history for one article — backs the
        // "gia ordinato" popup. MyMB reports no errors here: an unknown
        // article, an unknown customer and a malformed request all answer
        // ReturnCode 0 with an empty list, so an empty history is a success,
        // never a 404. Do not "improve" this into an error path.
        const data = await client.getLatestOrderByItem({
          customerCode: String(body.customer_code ?? ''),
          entityCode: String(body.entity_code ?? ''),
        });
        return NextResponse.json({
          status: 'success',
          data: mapErpLatestOrderRows(data),
        });
      }
      case 'get_customer': {
        const data = await client.getCustomer(body.customer_code);
        return NextResponse.json({ status: 'success', data });
      }
      case 'exposition': {
        const data = await client.getExposition(body.customer_code);
        return NextResponse.json({ status: 'success', data });
      }
      case 'payment_deadline': {
        const data = await client.getPaymentDeadline(body.customer_code);
        return NextResponse.json({ status: 'success', data });
      }
      case 'get_invoices': {
        const data = await client.getInvoices({
          customerCode: body.customer_code,
          addressCode: body.address_code,
          type: body.type,
          dateFrom: body.date_from,
          dateTo: body.date_to,
        });
        return NextResponse.json({ status: 'success', data });
      }
      case 'get_ddt': {
        const data = await client.getDdt({
          customerCode: body.customer_code,
          addressCode: body.address_code,
          type: body.type,
          dateFrom: body.date_from,
          dateTo: body.date_to,
        });
        return NextResponse.json({ status: 'success', data });
      }
      default:
        return NextResponse.json(
          { status: 'error', message: `Unknown ERP endpoint: ${endpoint}` },
          { status: 404 },
        );
    }
  } catch (error) {
    console.error(`[ERP route] ${endpoint} failed:`, error);
    return NextResponse.json(
      { status: 'error', message: (error as Error).message },
      { status: 502 },
    );
  }
}
