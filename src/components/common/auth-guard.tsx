'use client';

import { useEffect, useState } from 'react';
import { useUI } from '@contexts/ui.context';
import { useModalAction } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import { useTenantOptional } from '@contexts/tenant.context';
import Logo from '@components/ui/logo';

interface AuthGuardProps {
  children: React.ReactNode;
  lang: string;
}

// Fallback to env variable if tenant context not available
const ENV_REQUIRE_LOGIN = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true';

/**
 * AuthGuard - Optionally blocks access to the app if user is not authenticated.
 *
 * Priority for requireLogin setting:
 * 1. Tenant config (from TenantContext) - takes precedence
 * 2. Environment variable NEXT_PUBLIC_REQUIRE_LOGIN - fallback
 */
export default function AuthGuard({ children, lang }: AuthGuardProps) {
  const { isAuthorized } = useUI();
  const { openModal } = useModalAction();
  const { t } = useTranslation(lang, 'common');
  const tenantContext = useTenantOptional();
  const [mounted, setMounted] = useState(false);

  // Get requireLogin from tenant config, fallback to env variable
  const requireLogin = tenantContext?.tenant?.requireLogin ?? ENV_REQUIRE_LOGIN;

  // Debug logging for requireLogin reactivity
  useEffect(() => {
    console.log('[AuthGuard] Debug values:', {
      tenantId: tenantContext?.tenant?.id,
      tenantRequireLogin: tenantContext?.tenant?.requireLogin,
      envRequireLogin: ENV_REQUIRE_LOGIN,
      finalRequireLogin: requireLogin,
      isAuthorized,
      mounted,
    });
  }, [tenantContext, requireLogin, isAuthorized, mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Auto-open login modal when not authorized and login is required
    if (mounted && requireLogin && !isAuthorized) {
      openModal('LOGIN_VIEW');
    }
  }, [mounted, isAuthorized, openModal, requireLogin]);

  // During SSR or initial hydration, show nothing to prevent flash
  if (!mounted) {
    return null;
  }

  // If login not required, show content
  if (!requireLogin) {
    return <>{children}</>;
  }

  // If logged in, show content
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Not authorized - show blocking overlay with login prompt
  return (
    <div className="fixed inset-0 z-40 flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6 p-8 text-center">
        <Logo className="h-16 w-auto" />
        <h1 className="text-2xl font-semibold text-brand-dark">
          {t('text-login-required', { defaultValue: 'Login Required' })}
        </h1>
        <p className="max-w-md text-sm text-brand-muted">
          {t('text-login-required-description', {
            defaultValue:
              'Please login to access this site. If you do not have an account, contact your supplier.',
          })}
        </p>
        <button
          onClick={() => openModal('LOGIN_VIEW')}
          className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          {t('text-login', { defaultValue: 'Login' })}
        </button>
        <p className="text-sm text-brand-muted">
          {t("text-don't-have-account", {
            defaultValue: "Don't have an account?",
          })}{' '}
          <button
            onClick={() => openModal('SIGN_UP_VIEW')}
            className="font-semibold text-brand underline hover:text-brand-dark"
          >
            {t('text-create-account', { defaultValue: 'Request access' })}
          </button>
        </p>
      </div>
    </div>
  );
}
