import type { NextRequest } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

export interface CsCreds {
  csBaseUrl: string; // Commerce Suite base URL (tenant.api.pimApiUrl)
  apiKeyId: string;
  apiSecret: string;
}

/**
 * Resolve per-tenant Commerce-Suite credentials for data-models calls.
 * Single-tenant → env (PIM_API_*). Multi-tenant → tenant registry by hostname.
 */
export async function resolveCsCreds(req: NextRequest): Promise<CsCreds> {
  if (isSingleTenant) {
    return {
      csBaseUrl: process.env.PIM_API_URL || '',
      apiKeyId: process.env.PIM_API_KEY_ID || '',
      apiSecret: process.env.PIM_API_SECRET || '',
    };
  }
  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname);
  return {
    csBaseUrl: tenant?.api.pimApiUrl || process.env.PIM_API_URL || '',
    apiKeyId: tenant?.api.apiKeyId || '',
    apiSecret: tenant?.api.apiSecret || '',
  };
}
