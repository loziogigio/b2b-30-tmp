/**
 * POST /api/auth/activity
 *
 * Thin proxy that forwards a heartbeat to the SSO IdP's /api/auth/activity.
 * The IdP uses the heartbeat to update `session.last_user_activity`, which
 * is the clock the idle-timeout check uses on token refresh.
 *
 * The browser already has the access token in the (non-httpOnly) `auth_token`
 * cookie, but going through this proxy keeps the IdP off the public origin
 * (no CORS) and mirrors the existing /api/auth/refresh proxy pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';
import { getDefaultSsoApiUrl, getHostnameFromRequest } from '@/lib/auth/server';
import { AUTH_COOKIES } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'no_access_token' },
        { status: 401 },
      );
    }

    let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
    let ssoApiUrl = getDefaultSsoApiUrl();

    if (isMultiTenant) {
      const hostname = getHostnameFromRequest(request);
      const tenant = await resolveTenant(hostname);
      if (tenant) {
        tenantId = tenant.id;
        ssoApiUrl = process.env.SSO_API_URL_OVERRIDE || ssoApiUrl;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    let upstream: Response;
    try {
      upstream = await fetch(`${ssoApiUrl}/api/auth/activity`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      // Heartbeats are non-critical — fail soft so the client doesn't retry-storm.
      const isAbort = err instanceof Error && err.name === 'AbortError';
      console.warn(
        `[auth/activity] SSO ${isAbort ? 'timed out' : 'unreachable'}`,
      );
      return NextResponse.json(
        { ok: false, error: 'sso_unreachable' },
        { status: 503 },
      );
    }
    clearTimeout(timeout);

    return NextResponse.json({ ok: upstream.ok }, { status: upstream.status });
  } catch (error) {
    console.error('[auth/activity] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 },
    );
  }
}
