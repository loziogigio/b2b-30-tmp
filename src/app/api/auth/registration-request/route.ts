import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

// Default values from .env (used in single-tenant mode / fallback)
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_PRIVATE_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

// Local dev override - takes precedence over tenant config
const PIM_API_URL_OVERRIDE = process.env.PIM_API_URL_OVERRIDE;

async function getTenantConfig(req: NextRequest) {
  if (isSingleTenant) {
    return {
      pimApiUrl: PIM_API_URL_OVERRIDE || DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
    };
  }

  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname);

  if (!tenant) {
    return {
      pimApiUrl: PIM_API_URL_OVERRIDE || DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
    };
  }

  return {
    pimApiUrl:
      PIM_API_URL_OVERRIDE || tenant.api.pimApiUrl || DEFAULT_PIM_API_URL,
    apiKeyId: tenant.api.apiKeyId || DEFAULT_API_KEY_ID,
    apiSecret: tenant.api.apiSecret || DEFAULT_API_SECRET,
  };
}

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

    const config = await getTenantConfig(req);

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
        headers: {
          'Content-Type': 'application/json',
          'x-auth-method': 'api-key',
          ...(config.apiKeyId && { 'X-API-Key': config.apiKeyId }),
          ...(config.apiSecret && { 'X-API-Secret': config.apiSecret }),
        },
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
