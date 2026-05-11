'use client';

import { useSyncExternalStore } from 'react';

/**
 * Global "is the user's ERP/B2B profile working" flag.
 *
 * Lives outside React because it is updated from an axios interceptor.
 * `true` means recent customer-context calls (prices, cart) are failing —
 * the UI should warn the user to contact the shop.
 */
let unhealthy = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** Mark the ERP/B2B profile as broken. Idempotent. */
export function reportErpFailure(): void {
  if (unhealthy) return;
  unhealthy = true;
  emit();
}

/** Mark the ERP/B2B profile as healthy again. Idempotent. */
export function reportErpSuccess(): void {
  if (!unhealthy) return;
  unhealthy = false;
  emit();
}

/** Current value (used by `useSyncExternalStore` and tests). */
export function getErpHealthSnapshot(): boolean {
  return unhealthy;
}

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribeErpHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Server snapshot — always healthy so the banner never renders on SSR. */
function getServerSnapshot(): boolean {
  return false;
}

/** React hook: `{ unhealthy }`. */
export function useErpHealth(): { unhealthy: boolean } {
  const value = useSyncExternalStore(
    subscribeErpHealth,
    getErpHealthSnapshot,
    getServerSnapshot,
  );
  return { unhealthy: value };
}
