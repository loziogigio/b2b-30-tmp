'use client';

import { useEffect, useState } from 'react';
import { useUI } from '@contexts/ui.context';
import { useModalAction } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import { useTenantOptional } from '@contexts/tenant.context';
import { useHomeSettingsContext } from '@contexts/home-settings.context';
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
  const homeSettings = useHomeSettingsContext();
  const [mounted, setMounted] = useState(false);

  // Get company branding from home settings
  const branding = homeSettings?.settings?.branding;

  // Get requireLogin from tenant config, fallback to env variable
  const requireLogin = tenantContext?.tenant?.requireLogin ?? ENV_REQUIRE_LOGIN;

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

  // Not authorized - show blocking overlay with login prompt and company info
  return (
    <div className="fixed inset-0 z-40 flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-col items-center gap-6 p-8 text-center max-w-lg">
        {/* Company Logo */}
        <Logo className="h-20 w-auto" />

        {/* Company Name */}
        {branding?.title && (
          <h2 className="text-3xl font-bold text-gray-800">
            {branding.title}
          </h2>
        )}

        {/* Login Required Message */}
        <div className="mt-4">
          <h1 className="text-xl font-semibold text-brand-dark">
            {t('text-login-required', { defaultValue: 'Login Required' })}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('text-login-required-description', {
              defaultValue:
                'Please login to access this site. If you do not have an account, contact your supplier.',
            })}
          </p>
        </div>

        {/* Login Button */}
        <button
          onClick={() => openModal('LOGIN_VIEW')}
          className="mt-2 rounded-lg bg-brand px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark shadow-lg hover:shadow-xl"
        >
          {t('text-login', { defaultValue: 'Login' })}
        </button>

        {/* Sign Up Link */}
        <p className="text-sm text-gray-500">
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

        {/* Company Links */}
        {(branding?.websiteUrl || branding?.shopUrl) && (
          <div className="mt-6 pt-6 border-t border-gray-200 w-full">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              {branding?.websiteUrl && (
                <a
                  href={branding.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand transition-colors"
                >
                  {t('text-visit-website', { defaultValue: 'Visit Website' })}
                </a>
              )}
              {branding?.websiteUrl && branding?.shopUrl && (
                <span className="text-gray-300">|</span>
              )}
              {branding?.shopUrl && (
                <a
                  href={branding.shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand transition-colors"
                >
                  {t('text-visit-shop', { defaultValue: 'Visit Shop' })}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
