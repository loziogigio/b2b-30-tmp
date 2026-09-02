import { NextRequest, NextResponse } from 'next/server';
import {
  resolveAccountConfig,
  DEFAULT_ACCOUNT_CONFIG,
} from '@/lib/erp/account-config';

/**
 * GET /api/b2b/account-settings
 * Resolves the channel-scoped account-area display config (`account_settings`
 * data model) for the request's tenant. Never exposes the raw record. Falls
 * back to "everything visible" on any error.
 */
export async function GET(req: NextRequest) {
  try {
    const cfg = await resolveAccountConfig(req);
    return NextResponse.json({
      showFido: cfg.showFido,
      showDeadlines: cfg.showDeadlines,
    });
  } catch {
    return NextResponse.json(DEFAULT_ACCOUNT_CONFIG);
  }
}
