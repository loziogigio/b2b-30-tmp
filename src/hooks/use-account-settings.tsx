'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_ACCOUNT_CONFIG,
  asSectionVisible,
  type AccountConfig,
} from '@/lib/erp/account-config.types';

/**
 * Module-level shared promise so the sidebar and the dashboard trigger ONE
 * request to `/api/b2b/account-settings` rather than one each. The config is
 * process-stable for a session, so a single fetch is enough.
 */
let cached: Promise<AccountConfig> | null = null;

function loadAccountSettings(): Promise<AccountConfig> {
  if (cached) return cached;
  cached = fetch('/api/b2b/account-settings', {
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => (res.ok ? res.json() : DEFAULT_ACCOUNT_CONFIG))
    .then((data: Partial<AccountConfig>) => ({
      showFido: asSectionVisible(data?.showFido),
      showDeadlines: asSectionVisible(data?.showDeadlines),
    }))
    .catch(() => DEFAULT_ACCOUNT_CONFIG);
  return cached;
}

/**
 * Channel-scoped account-area display config. Returns everything visible until
 * the shared request resolves, so a section never flashes out of existence.
 */
export function useAccountSettings(): {
  settings: AccountConfig;
  isLoading: boolean;
} {
  const [settings, setSettings] = useState<AccountConfig>(
    DEFAULT_ACCOUNT_CONFIG,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadAccountSettings()
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
