'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_CART_CONFIG,
  type CartConfig,
} from '@/lib/erp/cart-config.types';

/**
 * Fetches the channel-scoped cart UI toggles from `/api/b2b/cart-settings`
 * (backed by the `cart_settings` data model, mirroring the coupon config flow).
 * Returns the defaults (both notes hidden) until the request resolves or on error.
 */
export function useCartSettings(): { settings: CartConfig; isLoading: boolean } {
  const [settings, setSettings] = useState<CartConfig>(DEFAULT_CART_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/b2b/cart-settings', {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : DEFAULT_CART_CONFIG))
      .then((data: Partial<CartConfig>) => {
        if (!active) return;
        setSettings({
          showLineNote: !!data?.showLineNote,
          showHeadNote: !!data?.showHeadNote,
          // Pickup defaults ON: only an explicit `false` hides it, so a missing
          // field keeps the historic "always visible" behaviour.
          showPickup: data?.showPickup !== false,
        });
      })
      .catch(() => {
        if (active) setSettings(DEFAULT_CART_CONFIG);
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
