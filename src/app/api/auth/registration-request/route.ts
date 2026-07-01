import { NextRequest, NextResponse } from 'next/server';
import { buildTenantApiHeaders, resolveTenantApiConfig } from '@/lib/tenant';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      company_name,
      email,
      city,
      address,
      phone,
      vat_number,
      sdi_code,
      pec,
      notes,
    } = body;

    if (!company_name || !email) {
      return NextResponse.json(
        { success: false, message: 'Company name and email are required' },
        { status: 400 },
      );
    }

    const config = await resolveTenantApiConfig(req);

    if (!config.pimApiUrl) {
      console.error('[registration-request] Missing PIM API URL');
      return NextResponse.json(
        { success: false, message: 'Registration service is not configured' },
        { status: 503 },
      );
    }

    const base = config.pimApiUrl.replace(/\/$/, '');
    const response = await fetch(
      `${base}/api/b2b/emails/registration-request`,
      {
        method: 'POST',
        headers: buildTenantApiHeaders(config, {
          includeLegacyApiKeyAlias: true,
        }),
        body: JSON.stringify({
          ragioneSociale: company_name,
          email,
          comune: city,
          indirizzo: address,
          telefono: phone,
          partitaIva: vat_number,
          sdi: sdi_code,
          pec,
          note: notes,
        }),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      console.error('[registration-request] PIM API error:', data);
      return NextResponse.json(
        {
          success: false,
          message: data.error || 'Failed to submit registration request',
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration request submitted successfully',
    });
  } catch (error) {
    console.error('[registration-request] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while submitting your request',
      },
      { status: 500 },
    );
  }
}
