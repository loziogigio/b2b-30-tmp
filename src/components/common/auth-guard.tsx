'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUI } from '@contexts/ui.context';
import { useModalAction } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import { useTenantOptional } from '@contexts/tenant.context';
import { useHomeSettingsContext } from '@contexts/home-settings.context';
import { useAutoRefreshToken } from '@/hooks/use-auto-refresh-token';
import { getClientSSOLoginUrl } from '@/lib/sso-api';
import Logo from '@components/ui/logo';
import { IoAlertCircle, IoClose } from 'react-icons/io5';

interface AuthGuardProps {
  children: React.ReactNode;
  lang: string;
}

/**
 * Map auth error codes to user-friendly messages
 */
const AUTH_ERROR_MESSAGES: Record<
  string,
  { title: string; description: string }
> = {
  token_exchange_failed: {
    title: 'Autenticazione fallita',
    description:
      "Si è verificato un problema durante l'autenticazione. Riprova o contatta l'assistenza se il problema persiste.",
  },
  no_code: {
    title: 'Sessione non valida',
    description:
      "La sessione di autenticazione non è valida. Riprova ad effettuare l'accesso.",
  },
  access_denied: {
    title: 'Accesso negato',
    description: 'Non hai i permessi per accedere a questa risorsa.',
  },
  invalid_request: {
    title: 'Richiesta non valida',
    description: 'La richiesta di autenticazione non è valida. Riprova.',
  },
  internal_error: {
    title: 'Errore interno',
    description: 'Si è verificato un errore interno. Riprova più tardi.',
  },
  session_expired: {
    title: 'Sessione scaduta',
    description: "La tua sessione è scaduta. Effettua nuovamente l'accesso.",
  },
  config_error: {
    title: 'Errore di configurazione',
    description:
      "Il sistema di autenticazione non è configurato correttamente. Contatta l'amministratore.",
  },
  sso_unreachable: {
    title: 'Server non raggiungibile',
    description:
      'Impossibile contattare il server di autenticazione. Verifica la connessione e riprova.',
  },
};

// Fallback to env variable if tenant context not available
const ENV_REQUIRE_LOGIN = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true';

/**
 * AuthGuard - Optionally blocks access to the app if user is not authenticated.
 *
 * Priority for requireLogin setting:
 * 1. Tenant config (from TenantContext) - takes precedence
 * 2. Environment variable NEXT_PUBLIC_REQUIRE_LOGIN - fallback
 *
 * Uses SSO redirect flow for authentication.
 */
export default function AuthGuard({ children, lang }: AuthGuardProps) {
  const { isAuthorized } = useUI();
  const { openModal } = useModalAction();
  const { t } = useTranslation(lang, 'common');
  const tenantContext = useTenantOptional();
  const homeSettings = useHomeSettingsContext();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showError, setShowError] = useState(true);

  // Auto-refresh token before it expires (only when authorized)
  useAutoRefreshToken();

  // Get auth error from URL params
  const authError = searchParams.get('auth_error');
  const errorMessage = searchParams.get('error_message');

  // Get company branding from home settings
  const branding = homeSettings?.settings?.branding;

  // Get requireLogin from tenant config, fallback to env variable
  const requireLogin = tenantContext?.tenant?.requireLogin ?? ENV_REQUIRE_LOGIN;

  // Get tenant ID
  const tenantId =
    tenantContext?.tenant?.id || process.env.NEXT_PUBLIC_TENANT_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for session expired events (from httpPIM interceptor)
  useEffect(() => {
    const handleSessionExpired = () => {
      console.log(
        '[AuthGuard] Session expired event received, redirecting to home',
      );
      // Redirect to home page - user will see login screen if requireLogin is enabled
      window.location.href = `/${lang}`;
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [lang]);

  // Get error info
  const errorInfo = authError ? AUTH_ERROR_MESSAGES[authError] : null;

  // Dismiss error and clean URL
  const dismissError = () => {
    setShowError(false);
    // Clean URL params without reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('auth_error');
      url.searchParams.delete('error_message');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Handle SSO login redirect
  const handleLogin = () => {
    const currentUrl =
      typeof window !== 'undefined' ? window.location.href : `/${lang}`;
    const ssoUrl = getClientSSOLoginUrl({
      tenantId,
      returnUrl: currentUrl,
      lang,
    });
    window.location.href = ssoUrl;
  };

  // Handle sign up - still uses modal for registration request
  const handleSignUp = () => {
    openModal('SIGN_UP_VIEW');
  };

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
        {/* Auth Error Alert */}
        {authError && showError && (
          <div className="w-full mb-2 p-4 bg-red-50 border border-red-200 rounded-lg relative">
            <button
              onClick={dismissError}
              className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
              aria-label="Chiudi"
            >
              <IoClose className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <IoAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-medium text-red-800">
                  {errorInfo?.title || 'Errore di autenticazione'}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {errorMessage ||
                    errorInfo?.description ||
                    'Si è verificato un errore. Riprova.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Company Logo */}
        <Logo className="h-20 w-auto" />

        {/* Company Name */}
        {branding?.title && (
          <h2 className="text-3xl font-bold text-gray-800">{branding.title}</h2>
        )}

        {/* Login Required Message */}
        <div className="mt-4">
          <h1 className="text-xl font-semibold text-brand-dark">
            {t('text-login-required', { defaultValue: 'Accesso Richiesto' })}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('text-login-required-description', {
              defaultValue:
                "Effettua l'accesso per visualizzare questo sito. Se non hai un account, contatta il tuo fornitore.",
            })}
          </p>
        </div>

        {/* Login Button - Redirects to SSO */}
        <button
          onClick={handleLogin}
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
            onClick={handleSignUp}
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
