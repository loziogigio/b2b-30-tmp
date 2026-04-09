import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

// Default values from .env (used in single-tenant mode)
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_PRIVATE_URL ||
  process.env.NEXT_PUBLIC_PIM_API_URL ||
  '';
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

async function getTenantConfig(req: NextRequest) {
  if (isSingleTenant) {
    return {
      pimApiUrl: DEFAULT_PIM_API_URL,
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
      pimApiUrl: DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
    };
  }

  return {
    pimApiUrl: tenant.api.pimApiUrl || DEFAULT_PIM_API_URL,
    apiKeyId: tenant.api.apiKeyId || DEFAULT_API_KEY_ID,
    apiSecret: tenant.api.apiSecret || DEFAULT_API_SECRET,
  };
}

export async function GET(req: NextRequest) {
  try {
    const config = await getTenantConfig(req);

    const response = await fetch(
      `${config.pimApiUrl}/api/b2b/home-settings`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKeyId && { 'X-API-Key': config.apiKeyId }),
          ...(config.apiSecret && { 'X-API-Secret': config.apiSecret }),
        },
      },
    );

    if (!response.ok) {
      // Return default branding settings when PIM API doesn't have config
      return NextResponse.json(DEFAULT_HOME_SETTINGS);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // Return default branding settings on error
    return NextResponse.json(DEFAULT_HOME_SETTINGS);
  }
}
