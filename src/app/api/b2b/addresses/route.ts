import { privateStorefrontRoute } from '@/lib/security/private-response';
import { NextRequest, NextResponse } from 'next/server';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';
import { buildTenantApiHeaders, resolveTenantApiConfig } from '@/lib/tenant';
import { sessionCustomerContext } from '@/lib/profile/session-owner';
import { attachAgents } from '@utils/transform/b2b-addresses';
import { getMyMbErpClient } from '@/lib/erp/factory';

// PIM API response type
interface PIMAddressResponse {
  id: string;
  title: string;
  isLegalSeat?: boolean;
  isDefault?: boolean;
  address: {
    street_address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  paymentTerms?: {
    code?: string;
  };
}

/**
 * Transform PIM API address response to AddressB2B format
 */
function transformPimAddress(addr: PIMAddressResponse): AddressB2B {
  return {
    id: addr.id,
    title: addr.title,
    isLegalSeat: addr.isLegalSeat || false,
    isDefault: addr.isDefault || false,
    address: {
      street_address: addr.address.street_address || '',
      city: addr.address.city || '',
      state: addr.address.state || '',
      zip: addr.address.zip || '',
      country: addr.address.country || '',
    },
    contact: {
      phone: addr.contact?.phone,
      mobile: undefined,
      email: addr.contact?.email,
    },
    agent: {
      code: undefined,
      name: undefined,
      email: undefined,
      phone: undefined,
    },
    paymentTerms: {
      code: addr.paymentTerms?.code,
      label: undefined,
    },
    port: {
      code: undefined,
      label: undefined,
    },
    carrier: {
      code: undefined,
      label: undefined,
    },
    currency: {
      code: undefined,
      label: undefined,
    },
  };
}

async function post(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 },
      );
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 },
      );
    }
    const { customer_id } = body as { customer_id?: unknown };

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 },
      );
    }

    // The address book is customer-scoped data. `customer_id` arrives from the
    // client, so it must be checked against the SSO-validated session before
    // it is used — otherwise any caller can read any customer's addresses.
    const sessionCtx = await sessionCustomerContext(request);
    const owned = sessionCtx?.owned ?? null;
    if (!owned) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const allowedAddressCodes = owned.get(String(customer_id));
    if (!allowedAddressCodes) {
      return NextResponse.json(
        { success: false, message: 'Customer not available for this profile' },
        { status: 403 },
      );
    }

    // Fail closed: an empty allowlist means no address was enabled for this
    // user in VINC. Returning every address would silently reproduce the bug
    // this gate exists to fix; returning an empty success would render an
    // unexplained address-less checkout. Surface it instead.
    if (allowedAddressCodes.size === 0) {
      console.warn(
        '[b2b/addresses] empty address allowlist for customer',
        customer_id,
      );
      return NextResponse.json(
        {
          success: false,
          code: 'NO_ADDRESS_FOR_PROFILE',
          message: 'No address is associated with this profile',
        },
        { status: 403 },
      );
    }

    const config = await resolveTenantApiConfig(request);
    const { pimApiUrl, tenantId } = config;

    if (!pimApiUrl) {
      console.error('[b2b/addresses] PIM API URL not configured');
      return NextResponse.json(
        { success: false, message: 'PIM API not configured' },
        { status: 500 },
      );
    }

    // Call PIM API to get addresses
    const endpoint = `${pimApiUrl}/api/b2b/addresses`;

    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      headers: buildTenantApiHeaders(config, {
        authorization: `Bearer ${sessionCtx!.token}`,
      }),
      body: JSON.stringify({
        customer_id,
        tenant_id: tenantId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[b2b/addresses] PIM API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return NextResponse.json(
        { success: false, message: `PIM API error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Transform to AddressB2B format, keeping only the addresses enabled for
    // this user, and sort the default address first.
    const addresses = data.addresses || data || [];
    const transformedAddresses = (Array.isArray(addresses) ? addresses : [])
      .filter((addr: PIMAddressResponse) =>
        allowedAddressCodes.has(String(addr.id)),
      )
      .map(transformPimAddress)
      .sort((a, b) => {
        // Default address first
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

    // The agent lives on the MyMB address record; the Suite does not carry it.
    // Best-effort: a tenant with no MyMB connection (or any ERP hiccup) yields
    // null and the addresses go out exactly as before, so the account page
    // omits the agent block rather than rendering a blank one.
    const erpCustomerCode = sessionCtx?.erpCodeById.get(String(customer_id));
    let withAgents = transformedAddresses;
    if (erpCustomerCode) {
      try {
        const erp = await getMyMbErpClient(request);
        withAgents = attachAgents(
          transformedAddresses,
          await erp.getCustomerAddressAgents(erpCustomerCode),
        );
      } catch (err) {
        console.warn(
          '[b2b/addresses] agent lookup skipped:',
          (err as Error).message,
        );
      }
    }

    return NextResponse.json({
      success: true,
      addresses: withAgents,
    });
  } catch (error) {
    console.error('[b2b/addresses] Error:', error);

    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 },
    );
  }
}

export const POST = privateStorefrontRoute(post);
