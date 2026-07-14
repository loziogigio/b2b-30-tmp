import { NextRequest, NextResponse } from 'next/server';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';
import { resolveTenantApiConfig } from '@/lib/tenant';
import { sessionOwnedCustomers } from '@/lib/profile/session-owner';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_id } = body;

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 },
      );
    }

    // The address book is customer-scoped data. `customer_id` arrives from the
    // client, so it must be checked against the SSO-validated session before
    // it is used — otherwise any caller can read any customer's addresses.
    const owned = await sessionOwnedCustomers(request);
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

    const { pimApiUrl, tenantId } = await resolveTenantApiConfig(request);

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
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      },
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

    return NextResponse.json({
      success: true,
      addresses: transformedAddresses,
    });
  } catch (error) {
    console.error('[b2b/addresses] Error:', error);

    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 },
    );
  }
}
