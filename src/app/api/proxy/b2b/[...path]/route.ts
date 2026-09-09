import { privateStorefrontRoute } from '@/lib/security/private-response';
import { NextRequest, NextResponse } from 'next/server';
import { POST as scopedErpRequest } from '@/app/api/erp/[...path]/route';
import { safeProxyPath } from '@/lib/security/storefront-proxy-policy';

// Retire arbitrary credential-bearing forwarding. These legacy browser paths
// now use the same customer-scoped implementation as the current storefront.
const legacyReads: Record<string, string> = {
  'erp/get_multiple_prices': 'get_multiple_prices',
  'account/get_orders': 'get_orders',
  'wrapper/get_order_detail': 'get_order_detail',
  'account/get_invoices': 'get_invoices',
  'account/get_ddt': 'get_ddt',
  'account/exposition': 'exposition',
  'account/payment_deadline': 'payment_deadline',
  'account/get_customer': 'get_customer',
};

async function post(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = safeProxyPath((await params).path);
  const endpoint = path && legacyReads[path];
  if (!endpoint) return denied();
  return scopedErpRequest(req, {
    params: Promise.resolve({ path: [endpoint] }),
  });
}

async function denied() {
  return NextResponse.json(
    { error: 'Endpoint not available to storefront' },
    { status: 403 },
  );
}
export {
  denied as GET,
  denied as PUT,
  denied as PATCH,
  denied as DELETE,
  denied as HEAD,
  denied as OPTIONS,
};

export const POST = privateStorefrontRoute(post);
