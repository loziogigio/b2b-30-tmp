/**
 * Redis-driven cache invalidation for the storefront.
 *
 * Mirrors vinc-b2c's `server/plugins/redis-cache-invalidation.ts`: the PIM
 * publishes comma-separated cache-tag names to `vinc-b2b:cache-invalidate:{tenantId}`
 * when an admin publishes; here we map those names to tenant-scoped Next.js cache
 * tags and call `revalidateTag()` so the next request re-fetches fresh PIM data.
 *
 * Started once per server process from `src/instrumentation.ts`. No-op when
 * `REDIS_HOST` is unset.
 */
import Redis from 'ioredis';
import { revalidateTag } from 'next/cache';
import { isSingleTenant } from '@/lib/tenant';
import { tagsForNames, SINGLE_TENANT_ID } from '@/lib/cache/tags';

const CHANNEL_PATTERN = 'vinc-b2b:cache-invalidate:*';

// Survive dev HMR — the module is re-evaluated on hot reload, the global isn't.
const g = globalThis as unknown as { __b2bRevalidateSub?: Redis };

export function startRevalidationSubscriber(): void {
  if (g.__b2bRevalidateSub) return;

  const host = process.env.REDIS_HOST;
  if (!host) {
    console.info(
      '[revalidate] REDIS_HOST not set — push cache invalidation disabled',
    );
    return;
  }

  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const sub = new Redis({
    host,
    port,
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });
  g.__b2bRevalidateSub = sub;

  sub.on('error', (err) =>
    console.warn('[revalidate] redis error:', err.message),
  );

  sub.psubscribe(CHANNEL_PATTERN, (err) => {
    if (err) console.warn('[revalidate] psubscribe failed:', err.message);
    else console.info(`[revalidate] listening on ${CHANNEL_PATTERN}`);
  });

  sub.on('pmessage', (_pattern, channel, message) => {
    try {
      const tenantId = channel.slice(channel.lastIndexOf(':') + 1);
      // Single-tenant deployments only care about their own tenant's events.
      if (isSingleTenant && tenantId !== SINGLE_TENANT_ID) return;

      const names = message
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const tags = tagsForNames(names, tenantId);
      for (const tag of tags) {
        try {
          revalidateTag(tag);
        } catch (e) {
          console.warn(
            `[revalidate] revalidateTag(${tag}) failed:`,
            (e as Error).message,
          );
        }
      }
      if (tags.length) {
        console.info(
          `[revalidate] flushed tags for tenant ${tenantId}: ${tags.join(', ')}`,
        );
      }
    } catch (e) {
      console.warn(
        '[revalidate] bad message on',
        channel,
        '-',
        (e as Error).message,
      );
    }
  });
}
