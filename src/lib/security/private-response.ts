import type { NextResponse } from 'next/server';

/** Never let customer data or authorization failures enter a shared cache. */
export function privateStorefrontResponse<T extends NextResponse>(
  response: T,
): T {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

export function privateStorefrontRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args) => privateStorefrontResponse(await handler(...args));
}
