import { NextRequest, NextResponse } from 'next/server';
import { CouponClient } from 'vinc-erp';
import { getMyMbErpClient } from '@/lib/erp/factory';
import { resolveCouponConfig } from '@/lib/erp/coupon-config';
import { buildOrderDetailResponse } from '@utils/transform/erp-order-detail';

type RouteParams = { params: Promise<{ path: string[] }> };

const COUPON_ENDPOINTS = new Set([
  'validate_coupon', 'check_coupon_cart', 'submit_coupon', 'verify_promo_item',
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
    return NextResponse.json({ status: 'error', message: 'Coupons not enabled' });
  }
  const client = new CouponClient({ baseUrl: cfg.baseUrl, authHeader: cfg.authHeader });
  const cliente = erpCustomerCode(body.codiceInternoCliente);

  switch (endpoint) {
    case 'validate_coupon': {
      const data = await client.validateCoupon(cliente, body.codiceCoupon);
      return NextResponse.json({ status: 'success', data });
    }
    case 'check_coupon_cart': {
      const info = await client.getCartCoupon(body.id_cart);
      const codice = info?.GetInfoCouponFromDocumentoResult?.m_Item2?.Codice;
      if (!codice) {
        return NextResponse.json({ status: 'error', message: 'No coupon on cart' });
      }
      const data = await client.validateCoupon(cliente, codice);
      return NextResponse.json({ status: 'success', data });
    }
    case 'submit_coupon': {
      const data = await client.submitCoupon(body.idElaborazione, body.codiceCoupon);
      return NextResponse.json({ status: 'success', data });
    }
    case 'verify_promo_item': {
      const data = await client.verifyPromoItem(
        cliente, body.codiceIndirizzo, body.codiceInternoArticolo,
      );
      return NextResponse.json({ status: 'success', data });
    }
    default:
      return NextResponse.json({ status: 'error', message: `Unknown coupon endpoint: ${endpoint}` }, { status: 404 });
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

  if (COUPON_ENDPOINTS.has(endpoint)) {
    try {
      return await handleCoupon(endpoint, body, req);
    } catch (error) {
      console.error(`[ERP route] coupon ${endpoint} failed:`, error);
      return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 502 });
    }
  }

  try {
    const client = await getMyMbErpClient(req);

    switch (endpoint) {
      case 'get_multiple_prices': {
        const data = await client.getMultiplePrices({
          customerCode: body.customer_code,
          addressCode: body.address_code,
          entityCodes: body.entity_codes ?? [],
          quantityList: body.quantity_list,
          idCart: body.id_cart,
        });
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
        const righe = await client.getCartRows(testata.IDCarrello);
        return NextResponse.json(buildOrderDetailResponse(testata, righe));
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
