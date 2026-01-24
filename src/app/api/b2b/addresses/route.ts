import { NextRequest, NextResponse } from 'next/server';
import { vincApi, VincApiError, getVincApiForTenant } from '@/lib/vinc-api';
import type { B2BAddress } from '@/lib/vinc-api/types';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';

/**
 * Transform VINC API B2BAddress to AddressB2B format
 * Maps fields from PostgreSQL model to the UI model
 */
function transformVincAddress(addr: B2BAddress): AddressB2B {
  const title = addr.city
    ? `${addr.street || addr.label || ''} - ${addr.city}`
    : addr.street || addr.label || addr.erp_address_id;

  return {
    id: addr.erp_address_id,
    title,
    isLegalSeat: false, // VINC API doesn't have legal seat info, ERP fallback provides this
    isDefault: addr.is_default || false,
    address: {
      street_address: addr.street || '',
      city: addr.city || '',
      state: addr.province || '',
      zip: addr.zip || '',
      country: addr.country || '',
    },
    contact: {
      phone: addr.phone || undefined,
      mobile: undefined,
      email: addr.email || undefined,
    },
    agent: {
      code: undefined,
      name: undefined,
      email: undefined,
      phone: undefined,
    },
    paymentTerms: {
      code: addr.payment_terms_code || undefined,
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

    // Get VINC API client (multi-tenant aware)
    let api = vincApi;
    if (isMultiTenant) {
      const hostname =
        request.headers.get('x-tenant-hostname') ||
        request.headers.get('host') ||
        'localhost';
      const tenant = await resolveTenant(hostname);

      if (!tenant) {
        console.error('[b2b/addresses] Tenant not found for hostname:', hostname);
        return NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        );
      }

      api = getVincApiForTenant({ projectCode: tenant.projectCode });
    }

    // Call VINC API to get addresses
    const addresses = await api.b2b.getAddresses(customer_id);

    // Transform to AddressB2B format and sort default address first
    const transformedAddresses = addresses
      .filter((addr) => addr.is_active)
      .map(transformVincAddress)
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

    if (error instanceof VincApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.detail || 'Failed to fetch addresses',
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 },
    );
  }
}
