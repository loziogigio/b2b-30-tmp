/**
 * SSO Redirect Utilities
 *
 * Helpers for OAuth-style redirect flow with Commerce Suite SSO.
 */

const SSO_API_URL = process.env.SSO_API_URL || process.env.PIM_API_URL || '';
const APP_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || '';
const CLIENT_ID = 'vinc-b2b';

export interface SSORedirectParams {
  tenantId?: string;
  returnUrl?: string;
  lang?: string;
}

/**
 * Build the SSO login URL for redirect
 */
export function getSSOLoginUrl(params: SSORedirectParams = {}): string {
  const { tenantId, returnUrl, lang } = params;

  // The callback URL where SSO will redirect after login
  const callbackUrl = `${APP_URL}/api/auth/callback`;

  const searchParams = new URLSearchParams({
    redirect_uri: callbackUrl,
    client_id: CLIENT_ID,
  });

  if (tenantId) {
    searchParams.set('tenant_id', tenantId);
  }

  // Store the original URL the user wanted to access
  if (returnUrl) {
    searchParams.set('state', encodeURIComponent(returnUrl));
  }

  if (lang) {
    searchParams.set('lang', lang);
  }

  return `${SSO_API_URL}/auth/login?${searchParams.toString()}`;
}

/**
 * Build the SSO logout URL for redirect
 */
export function getSSOLogoutUrl(params: { returnUrl?: string } = {}): string {
  const searchParams = new URLSearchParams({
    client_id: CLIENT_ID,
  });

  if (params.returnUrl) {
    searchParams.set('redirect_uri', params.returnUrl);
  }

  return `${SSO_API_URL}/auth/logout?${searchParams.toString()}`;
}

/**
 * Client-side function to get SSO login URL
 * Uses NEXT_PUBLIC_ env vars available in browser
 */
export function getClientSSOLoginUrl(params: SSORedirectParams = {}): string {
  const ssoUrl =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_SSO_URL ||
        process.env.NEXT_PUBLIC_B2B_BUILDER_URL ||
        ''
      : SSO_API_URL;

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : APP_URL;

  const { tenantId, returnUrl, lang } = params;

  const callbackUrl = `${appUrl}/api/auth/callback`;

  const searchParams = new URLSearchParams({
    redirect_uri: callbackUrl,
    client_id: CLIENT_ID,
  });

  if (tenantId) {
    searchParams.set('tenant_id', tenantId);
  }

  if (returnUrl) {
    searchParams.set('state', encodeURIComponent(returnUrl));
  }

  if (lang) {
    searchParams.set('lang', lang);
  }

  return `${ssoUrl}/auth/login?${searchParams.toString()}`;
}
