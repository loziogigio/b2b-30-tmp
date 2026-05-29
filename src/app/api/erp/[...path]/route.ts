import { NextRequest, NextResponse } from 'next/server';
import { getMyMbErpClient } from '@/lib/erp/factory';

type RouteParams = { params: Promise<{ path: string[] }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const endpoint = path.join('/');

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
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
