/**
 * Next.js instrumentation — runs once per server process at startup.
 * Boots the Redis cache-invalidation subscriber (Node runtime only).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startRevalidationSubscriber } = await import(
    '@/lib/cache/revalidation-subscriber'
  );
  startRevalidationSubscriber();
}
