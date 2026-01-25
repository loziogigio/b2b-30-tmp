'use client';

import { useCallback } from 'react';
import { useTenantOptional } from '@contexts/tenant.context';

/**
 * Build SSO login URL for redirect (client-side)
 */
function buildSSOLoginUrl(params: {
  tenantId?: string;
  returnUrl?: string;
  lang?: string;
}): string {
  const ssoUrl =
    process.env.NEXT_PUBLIC_SSO_URL ||
    process.env.NEXT_PUBLIC_B2B_BUILDER_URL ||
    '';

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${appUrl}/api/auth/callback`;

  const searchParams = new URLSearchParams({
    redirect_uri: callbackUrl,
    client_id: 'vinc-b2b',
  });

  if (params.tenantId) {
    searchParams.set('tenant_id', params.tenantId);
  }

  if (params.returnUrl) {
    searchParams.set('state', encodeURIComponent(params.returnUrl));
  }

  if (params.lang) {
    searchParams.set('lang', params.lang);
  }

  return `${ssoUrl}/auth/login?${searchParams.toString()}`;
}

/**
 * Hook for SSO login redirect
 * @param lang - Current language
 * @returns Functions to trigger SSO login
 */
export function useSSOLogin(lang: string) {
  const tenantContext = useTenantOptional();

  // Get tenant ID
  const tenantId =
    tenantContext?.tenant?.id || process.env.NEXT_PUBLIC_TENANT_ID;

  /**
   * Redirect to SSO login page
   * @param returnUrl - Optional URL to return to after login (defaults to current page)
   */
  const login = useCallback(
    (returnUrl?: string) => {
      const currentUrl =
        returnUrl ||
        (typeof window !== 'undefined' ? window.location.href : `/${lang}`);

      const ssoUrl = buildSSOLoginUrl({
        tenantId,
        returnUrl: currentUrl,
        lang,
      });

      window.location.href = ssoUrl;
    },
    [tenantId, lang],
  );

  /**
   * Get the SSO login URL without redirecting
   * @param returnUrl - Optional URL to return to after login
   */
  const getLoginUrl = useCallback(
    (returnUrl?: string) => {
      const currentUrl =
        returnUrl ||
        (typeof window !== 'undefined' ? window.location.href : `/${lang}`);

      return buildSSOLoginUrl({
        tenantId,
        returnUrl: currentUrl,
        lang,
      });
    },
    [tenantId, lang],
  );

  return {
    login,
    getLoginUrl,
    tenantId,
  };
}
