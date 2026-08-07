import { NextRequest, NextResponse } from 'next/server';
import {
  resolveCatalogConfig,
  DEFAULT_CATALOG_CONFIG,
} from '@/lib/erp/catalog-config';

/**
 * GET /api/b2b/catalog-settings
 * Resolves the channel-scoped catalog UI config (`catalog_settings` data model)
 * for the request's tenant and returns just the fields the storefront needs.
 * Never exposes the raw data-model record. Falls back to defaults on any error.
 */
export async function GET(req: NextRequest) {
  try {
    const cfg = await resolveCatalogConfig(req);
    return NextResponse.json({
      defaultView: cfg.defaultView,
      productOpenMode: cfg.productOpenMode,
      availabilityDisplay: cfg.availabilityDisplay,
      arrivalDisplay: cfg.arrivalDisplay,
    });
  } catch {
    return NextResponse.json(DEFAULT_CATALOG_CONFIG);
  }
}
