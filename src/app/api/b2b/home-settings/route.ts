import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';
import {
  mapPortalToHomeSettings,
  type PortalPayload,
} from '@/lib/home-settings/portal-mapper';

// Default values from .env (used in single-tenant mode)
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_PRIVATE_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';
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
    const base = (config.pimApiUrl || '').replace(/\/$/, '');

    const response = await fetch(
      `${base}/api/b2b/b2b/public/home?portal=default`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-method': 'api-key',
          ...(config.apiKeyId && { 'X-API-Key': config.apiKeyId }),
          ...(config.apiSecret && { 'X-API-Secret': config.apiSecret }),
        },
      },
    );

    if (!response.ok) {
      // Return default settings when the PIM API doesn't have a portal yet
      return NextResponse.json(DEFAULT_HOME_SETTINGS);
    }

    const data = (await response.json()) as { portal?: PortalPayload };
    return NextResponse.json(mapPortalToHomeSettings(data?.portal));
  } catch {
    // Return default settings on error
    return NextResponse.json(DEFAULT_HOME_SETTINGS);
  }
}
