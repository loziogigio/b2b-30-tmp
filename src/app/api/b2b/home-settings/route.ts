import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';
import { resolveTenantApiConfig } from '@/lib/tenant';
import {
  mapPortalToHomeSettings,
  type PortalPayload,
} from '@/lib/home-settings/portal-mapper';

export async function GET(req: NextRequest) {
  try {
    const config = await resolveTenantApiConfig(req);
    const base = (config.pimApiUrl || '').replace(/\/$/, '');

    const lang = new URL(req.url).searchParams.get('lang');
    const upstream =
      `${base}/api/b2b/b2b/public/home?portal=default` +
      (lang ? `&lang=${encodeURIComponent(lang)}` : '');

    const response = await fetch(upstream, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-method': 'api-key',
        ...(config.apiKeyId && { 'X-API-Key': config.apiKeyId }),
        ...(config.apiSecret && { 'X-API-Secret': config.apiSecret }),
      },
    });

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
