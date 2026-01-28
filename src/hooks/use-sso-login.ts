'use client';

import { useCallback } from 'react';
import { useTenantOptional } from '@contexts/tenant.context';
import { getClientSSOLoginUrl } from '@/lib/sso-api';

/**
 * Hook for SSO login redirect
 * @param lang - Current language
 * @returns Functions to trigger SSO login
 */
export function useSSOLogin(lang: string) {
  const tenantContext = useTenantOptional();

  // Get tenant ID and SSO URL from tenant context
  const tenantId =
    tenantContext?.tenant?.id || process.env.NEXT_PUBLIC_TENANT_ID;
  const tenantSsoUrl = tenantContext?.tenant?.builderUrl;

  /**
   * Redirect to SSO login page
   * @param returnUrl - Optional URL to return to after login (defaults to current page)
   */
  const login = useCallback(
    (returnUrl?: string) => {
      const currentUrl =
        returnUrl ||
        (typeof window !== 'undefined' ? window.location.href : `/${lang}`);

      const ssoUrl = getClientSSOLoginUrl({
        tenantId,
        returnUrl: currentUrl,
        lang,
        ssoUrl: tenantSsoUrl,
      });

      window.location.href = ssoUrl;
    },
    [tenantId, lang, tenantSsoUrl],
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

      return getClientSSOLoginUrl({
        tenantId,
        returnUrl: currentUrl,
        lang,
        ssoUrl: tenantSsoUrl,
      });
    },
    [tenantId, lang, tenantSsoUrl],
  );

  return {
    login,
    getLoginUrl,
    tenantId,
  };
}
