import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import { buildTenantApiHeaders } from '@/lib/tenant';
import {
  csCustomerToProfile,
  type CsCustomerRecord,
} from '@utils/transform/cs-customer';

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const customerId = body?.customer_id;
  if (!customerId) {
    return NextResponse.json(
      { success: false, message: 'customer_id is required' },
      { status: 400 },
    );
  }

  const creds = await resolveCsCreds(req);

  try {
    const res = await fetch(
      `${creds.csBaseUrl.replace(/\/+$/, '')}/api/b2b/customers/${encodeURIComponent(customerId)}`,
      {
        headers: buildTenantApiHeaders(creds, {
          contentType: false,
          includeLegacyApiKeyAlias: true,
        }),
      },
    );
    if (!res.ok) {
      console.error(`[b2b/customer] CS customers HTTP ${res.status}`);
      return NextResponse.json(
        { success: false, message: `CS customer HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const json: any = await res.json();
    const customer = json?.customer ?? json?.data;
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      customer: csCustomerToProfile(customer as CsCustomerRecord),
    });
  } catch (error) {
    console.error('[b2b/customer] failed:', error);
    return NextResponse.json(
      { success: false, message: 'customer fetch failed' },
      { status: 502 },
    );
  }
}
