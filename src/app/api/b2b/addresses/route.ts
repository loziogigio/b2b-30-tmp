import { NextResponse } from 'next/server';
import { vincApi, VincApiError } from '@/lib/vinc-api';
import type { B2BAddress } from '@/lib/vinc-api/types';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id } = body;

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 },
      );
    }

    console.log('[b2b/addresses] Fetching for customer_id:', customer_id);

    // Call VINC API to get addresses
    const addresses = await vincApi.b2b.getAddresses(customer_id);

    console.log(
      '[b2b/addresses] VINC API raw response:',
      JSON.stringify(addresses, null, 2),
    );

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

    console.log(
      '[b2b/addresses] Transformed addresses:',
      transformedAddresses.length,
    );

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
