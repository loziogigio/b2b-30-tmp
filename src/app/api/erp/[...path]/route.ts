import { NextRequest, NextResponse } from 'next/server';
import { CouponClient } from 'vinc-erp';
import { getMyMbErpClient } from '@/lib/erp/factory';
import { resolveCouponConfig } from '@/lib/erp/coupon-config';

type RouteParams = { params: Promise<{ path: string[] }> };

const COUPON_ENDPOINTS = new Set([
  'validate_coupon', 'check_coupon_cart', 'submit_coupon', 'verify_promo_item',
]);

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

  switch (endpoint) {
    case 'validate_coupon': {
      const data = await client.validateCoupon(body.codiceInternoCliente, body.codiceCoupon);
      return NextResponse.json({ status: 'success', data });
    }
    case 'check_coupon_cart': {
      const info = await client.getCartCoupon(body.id_cart);
      const codice = info?.GetInfoCouponFromDocumentoResult?.m_Item2?.Codice;
      if (!codice) {
        return NextResponse.json({ status: 'error', message: 'No coupon on cart' });
      }
      const data = await client.validateCoupon(body.codiceInternoCliente, codice);
      return NextResponse.json({ status: 'success', data });
    }
    case 'submit_coupon': {
      const data = await client.submitCoupon(body.idElaborazione, body.codiceCoupon);
      return NextResponse.json({ status: 'success', data });
    }
    case 'verify_promo_item': {
      const data = await client.verifyPromoItem(
        body.codiceInternoCliente, body.codiceIndirizzo, body.codiceInternoArticolo,
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
