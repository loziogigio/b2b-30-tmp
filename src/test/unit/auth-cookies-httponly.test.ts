/**
 * hidros V7 (2026-09-09): the access token cookie was readable from
 * document.cookie. It must be httpOnly, Secure in production and SameSite;
 * browser code must not write it and must infer logged-in state from the
 * readable, non-secret expiry marker instead.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const jar = new Map<string, string>();
vi.mock('js-cookie', () => ({
  default: {
    get: (name?: string) =>
      name === undefined ? Object.fromEntries(jar) : jar.get(name),
    set: (name: string, value: string) => void jar.set(name, value),
    remove: (name: string) => void jar.delete(name),
  },
}));

const {
  AUTH_COOKIES,
  setAuthTokensServer,
  setAuthTokensClient,
  hasAuthToken,
  getAuthToken,
  clearAuthCookiesServer,
} = await import('@/lib/auth/cookies');

describe('access token cookie hardening', () => {
  beforeEach(() => {
    jar.clear();
    vi.stubGlobal('window', { location: { protocol: 'https:' } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sets the access token httpOnly, Secure (prod) and SameSite from the server', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = NextResponse.json({ ok: true });
    setAuthTokensServer(res, {
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 3600,
      sessionId: 'sid',
    });
    const access = res.cookies.get(AUTH_COOKIES.ACCESS_TOKEN);
    expect(access?.value).toBe('at');
    expect(access?.httpOnly).toBe(true);
    expect(access?.secure).toBe(true);
    expect(access?.sameSite).toBe('lax');
    expect(res.cookies.get(AUTH_COOKIES.REFRESH_TOKEN)?.httpOnly).toBe(true);
    expect(res.cookies.get(AUTH_COOKIES.SESSION_ID)?.httpOnly).toBe(true);
    // The expiry marker is deliberately readable: it carries no secret.
    expect(res.cookies.get(AUTH_COOKIES.TOKEN_EXPIRES_AT)?.httpOnly).toBe(
      false,
    );
    vi.unstubAllEnvs();
  });

  it('never writes the access or refresh token from browser JavaScript', () => {
    setAuthTokensClient({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 60,
    });
    expect(jar.has(AUTH_COOKIES.ACCESS_TOKEN)).toBe(false);
    expect(jar.has(AUTH_COOKIES.REFRESH_TOKEN)).toBe(false);
    expect(jar.has(AUTH_COOKIES.TOKEN_EXPIRES_AT)).toBe(true);
    expect(getAuthToken()).toBeNull();
  });

  it('infers logged-in state from an unexpired expiry marker', () => {
    expect(hasAuthToken()).toBe(false);
    jar.set(AUTH_COOKIES.TOKEN_EXPIRES_AT, String(Date.now() + 60_000));
    expect(hasAuthToken()).toBe(true);
    jar.set(AUTH_COOKIES.TOKEN_EXPIRES_AT, String(Date.now() - 1));
    expect(hasAuthToken()).toBe(false);
  });

  it('expires the httpOnly access token on logout', () => {
    const res = NextResponse.json({ ok: true });
    clearAuthCookiesServer(res);
    const access = res.cookies.get(AUTH_COOKIES.ACCESS_TOKEN);
    expect(access?.value).toBe('');
    expect(access?.maxAge).toBe(0);
  });
});
