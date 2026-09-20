import type { NextRequest } from 'next/server';
import { cachedJson, delByPrefix } from '@/lib/cache/redis-cache';
import { getMyMbErpClient } from '@/lib/erp/factory';

const SOFT_TTL_MS = 6 * 60 * 60 * 1000; // mirrors UPDATE_PROMO_IN_SECONDS
const HARD_TTL_SECONDS = 24 * 60 * 60;

/** Tenant id first — six tenants share one internal CS URL (runbook §2). */
export function entitlementCacheKey(
  tenantId: string,
  customerCode: string,
  addressCode: string,
): string {
  return `${entitlementCachePrefix(tenantId, customerCode)}${addressCode}`;
}

/** Every address key of one customer; the closing colon keeps 5687 off 56870. */
function entitlementCachePrefix(
  tenantId: string,
  customerCode: string,
): string {
  return `promo-entitlement:${tenantId}:${customerCode}:`;
}

/**
 * Forget the cached entitlement for EVERY address of this customer, so the
 * next search re-asks the ERP. Called on login: promo headers are attached in
 * MyMB during the day and a logged-in customer otherwise waits out the soft
 * TTL (bellieforti 5687, 2026-09-18). Best-effort — never throws, never blocks
 * the login that triggered it.
 */
export async function purgePromoEntitlement(
  tenantId: string,
  customerCode: string,
): Promise<void> {
  if (!tenantId || !customerCode) return;
  try {
    await delByPrefix(entitlementCachePrefix(tenantId, customerCode));
  } catch (err) {
    console.warn('[promo-entitlement] purge failed:', (err as Error).message);
  }
}

/**
 * The promo codes this customer may actually receive.
 *
 * `null` = unknown (ERP unreachable or a ReturnCode !== 0 business error) —
 * callers MUST fail open and filter nothing. An empty Set = the customer is
 * genuinely entitled to nothing, which is a real answer and DOES filter.
 */
export async function getEntitledPromoCodes(args: {
  req: NextRequest;
  tenantId: string;
  customerCode: string;
  addressCode: string;
}): Promise<Set<string> | null> {
  const { req, tenantId, customerCode, addressCode } = args;
  if (!tenantId || !customerCode || !addressCode) return null;

  try {
    // Cache the plain array: a Set does not survive JSON serialisation.
    const codes = await cachedJson<string[]>(
      entitlementCacheKey(tenantId, customerCode, addressCode),
      { softTtlMs: SOFT_TTL_MS, hardTtlSeconds: HARD_TTL_SECONDS },
      async () => {
        // The factory resolves the tenant from the request itself.
        const client = await getMyMbErpClient(req);
        const promos = await client.getCustomerPromos(
          customerCode,
          addressCode,
        );
        // THROW on unknown rather than return null: cachedJson persists
        // whatever the producer returns, and a cached null would fail open
        // for the whole soft TTL after a single ERP blip. Throwing means
        // nothing is written (or a stale REAL answer is served), and the
        // outer catch still turns it into the caller's null.
        if (promos === null) throw new Error('promo entitlement unknown');
        return promos.map((p) => p.code);
      },
    );
    return new Set(codes);
  } catch (err) {
    console.warn('[promo-entitlement] lookup failed:', (err as Error).message);
    return null;
  }
}
