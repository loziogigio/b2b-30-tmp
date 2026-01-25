import { NextRequest, NextResponse } from 'next/server';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';

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

    // Resolve tenant
    let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
    // Use PIM_API_URL for addresses (not SSO)
    let pimApiUrl = process.env.PIM_API_URL;

    if (isMultiTenant) {
      const hostname =
        request.headers.get('x-tenant-hostname') ||
        request.headers.get('host') ||
        'localhost';
      const tenant = await resolveTenant(hostname);

      if (!tenant) {
        console.error(
          '[b2b/addresses] Tenant not found for hostname:',
          hostname,
        );
        return NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        );
      }

      tenantId = tenant.id;
      pimApiUrl = tenant.api.pimApiUrl || pimApiUrl;
    }

    if (!pimApiUrl) {
      console.error('[b2b/addresses] PIM_API_URL not configured');
      return NextResponse.json(
        { success: false, message: 'PIM API not configured' },
        { status: 500 },
      );
    }

    // Call PIM API to get addresses
    const endpoint = `${pimApiUrl}/api/b2b/addresses`;
    console.log('[b2b/addresses] Calling PIM API:', {
      pimApiUrl,
      tenantId,
      customer_id,
      endpoint,
    });

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

    // Transform to AddressB2B format and sort default address first
    const addresses = data.addresses || data || [];
    const transformedAddresses = (Array.isArray(addresses) ? addresses : [])
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
