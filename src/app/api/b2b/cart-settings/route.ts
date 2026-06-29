import { NextRequest, NextResponse } from 'next/server';
import {
  resolveCartConfig,
  DEFAULT_CART_CONFIG,
} from '@/lib/erp/cart-config';

/**
 * GET /api/b2b/cart-settings
 * Resolves the channel-scoped cart UI toggles (`cart_settings` data model) for
 * the request's tenant and returns just the two booleans the storefront needs.
 * Never exposes the raw data-model record. Falls back to defaults on any error.
 */
export async function GET(req: NextRequest) {
  try {
    const cfg = await resolveCartConfig(req);
    return NextResponse.json({
      showLineNote: cfg.showLineNote,
      showHeadNote: cfg.showHeadNote,
      showPickup: cfg.showPickup,
    });
  } catch {
    return NextResponse.json(DEFAULT_CART_CONFIG);
  }
}
