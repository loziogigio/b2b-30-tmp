'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_CATALOG_CONFIG,
  asCatalogView,
  asProductOpenMode,
  asAvailabilityDisplay,
  type CatalogConfig,
} from '@/lib/erp/catalog-config.types';

/**
 * Module-level shared promise so the many catalog rows/cards on a listing page
 * trigger ONE request to `/api/b2b/catalog-settings` instead of one per card.
 * The config is process-stable for a session, so a single fetch is enough.
 */
let cached: Promise<CatalogConfig> | null = null;

function loadCatalogSettings(): Promise<CatalogConfig> {
  if (cached) return cached;
  cached = fetch('/api/b2b/catalog-settings', {
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => (res.ok ? res.json() : DEFAULT_CATALOG_CONFIG))
    .then((data: Partial<CatalogConfig>) => ({
      defaultView: asCatalogView(data?.defaultView),
      productOpenMode: asProductOpenMode(data?.productOpenMode),
      availabilityDisplay: asAvailabilityDisplay(data?.availabilityDisplay),
    }))
    .catch(() => DEFAULT_CATALOG_CONFIG);
  return cached;
}

/**
 * Fetches the channel-scoped catalog UI config (backed by the `catalog_settings`
 * data model). Returns the defaults until the shared request resolves.
 */
export function useCatalogSettings(): {
  settings: CatalogConfig;
  isLoading: boolean;
} {
  const [settings, setSettings] = useState<CatalogConfig>(
    DEFAULT_CATALOG_CONFIG,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadCatalogSettings()
      .then((cfg) => {
        if (active) setSettings(cfg);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { settings, isLoading };
}
