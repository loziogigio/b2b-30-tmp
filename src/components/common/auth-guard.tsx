'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUI } from '@contexts/ui.context';
import { useModalAction } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import { useTenantOptional } from '@contexts/tenant.context';
import { useHomeSettingsContext } from '@contexts/home-settings.context';
import { useAutoRefreshToken } from '@/hooks/use-auto-refresh-token';
import { useActivityHeartbeat } from '@/hooks/use-activity-heartbeat';
import { getClientSSOLoginUrl } from '@/lib/sso-api';
import { getCompanyProfile } from '@/lib/company-profile';
import Logo from '@components/ui/logo';
import { IoAlertCircle, IoClose } from 'react-icons/io5';
import {
  HiArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineCheckBadge,
  HiOutlineEnvelope,
  HiOutlineGlobeAlt,
  HiOutlineIdentification,
  HiOutlineMapPin,
  HiOutlinePhone,
} from 'react-icons/hi2';

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

function splitInfoLines(value?: string | null): string[] {
  if (!value) return [];

  return value
    .split(/\s*\|\s*|\s*;\s*/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

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

  // Heartbeat real user activity to the SSO IdP so idle sessions
  // (8h+ no input by default) are revoked on the next refresh.
  useActivityHeartbeat();

  // Get auth error from URL params
  const authError = searchParams.get('auth_error');
  const errorMessage = searchParams.get('error_message');

  // Get company branding from home settings
  const branding = homeSettings?.settings?.branding;
  const companyProfile = useMemo(
    () => getCompanyProfile(homeSettings?.settings),
    [homeSettings?.settings],
  );
  const legalInfoLines = useMemo(
    () =>
      splitInfoLines(companyProfile.legalLine).filter(
        (line) =>
          !companyProfile.vatNumber || !line.includes(companyProfile.vatNumber),
      ),
    [companyProfile.legalLine, companyProfile.vatNumber],
  );

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

  // If login not required, always render children (including during SSR for SEO)
  if (!requireLogin) {
    return <>{children}</>;
  }

  // Login required: wait for client mount to avoid hydration mismatch
  // (tenant stays fully private — Google sees nothing)
  if (!mounted) {
    return null;
  }

  // If logged in, show content
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Not authorized - show blocking overlay with login prompt and company info
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#eef4fb_45%,#e8eef7_100%)]">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[8%] top-[12%] h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute bottom-[14%] right-[10%] h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="relative min-h-screen w-full xl:grid xl:grid-cols-[40%_60%]">
        <div className="hidden bg-[linear-gradient(160deg,rgba(15,23,42,0.96)_0%,rgba(30,41,59,0.94)_42%,rgba(37,99,235,0.88)_100%)] text-white xl:flex xl:min-h-screen xl:justify-end">
          <div className="flex w-full max-w-[42rem] flex-col justify-center px-10 py-16 2xl:px-16">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-100/90">
                <HiOutlineCheckBadge className="h-4 w-4" />
                {t('text-login-portal-label', {
                  defaultValue: 'B2B Portal',
                })}
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-100/75">
                  {companyProfile.brandName ||
                    t('text-login-portal-eyebrow', {
                      defaultValue: 'Private commerce',
                    })}
                </p>
                <h1 className="max-w-md text-4xl font-semibold leading-tight text-white">
                  {companyProfile.name}
                </h1>
                <p className="max-w-lg text-base leading-7 text-slate-200/88">
                  {companyProfile.description ||
                    t('text-login-subtitle', {
                      defaultValue: 'Sign in to manage your orders',
                    })}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
                    <HiOutlineMapPin className="h-5 w-5 text-sky-100" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {t('text-delivery-address', {
                        defaultValue: 'Address',
                      })}
                    </p>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-slate-200/80">
                      {companyProfile.addressLines.length > 0 ? (
                        companyProfile.addressLines.map((line) => (
                          <p
                            key={line}
                            className="border-b border-white/5 pb-2 last:border-b-0 last:pb-0"
                          >
                            {line}
                          </p>
                        ))
                      ) : (
                        <p>{companyProfile.brandName || companyProfile.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
                    <HiOutlinePhone className="h-5 w-5 text-sky-100" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {t('text-login-company-contact-title', {
                        defaultValue: 'Contact',
                      })}
                    </p>
                    <div className="mt-2 space-y-2 text-sm leading-6 text-slate-200/80">
                      {companyProfile.phone && (
                        <a
                          href={`tel:${companyProfile.phone.replace(/\s+/g, '')}`}
                          className="flex items-start gap-2 transition-colors hover:text-white"
                        >
                          <HiOutlinePhone className="mt-1 h-4 w-4 shrink-0 text-sky-100/90" />
                          <span>{companyProfile.phone}</span>
                        </a>
                      )}
                      {companyProfile.email && (
                        <a
                          href={`mailto:${companyProfile.email}`}
                          className="flex items-start gap-2 transition-colors hover:text-white"
                        >
                          <HiOutlineEnvelope className="mt-1 h-4 w-4 shrink-0 text-sky-100/90" />
                          <span>{companyProfile.email}</span>
                        </a>
                      )}
                      {!companyProfile.phone && !companyProfile.email && (
                        <p>{companyProfile.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
                    <HiOutlineBuildingOffice2 className="h-5 w-5 text-sky-100" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {t('text-login-company-legal-title', {
                        defaultValue: 'Company',
                      })}
                    </p>
                    <div className="mt-2 space-y-2 text-sm leading-6 text-slate-200/80">
                      <p>{companyProfile.name}</p>
                      {companyProfile.vatNumber && (
                        <p className="flex items-start gap-2">
                          <HiOutlineIdentification className="mt-1 h-4 w-4 shrink-0 text-sky-100/90" />
                          <span>VAT {companyProfile.vatNumber}</span>
                        </p>
                      )}
                      {companyProfile.websiteUrl && (
                        <a
                          href={companyProfile.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-2 transition-colors hover:text-white"
                        >
                          <HiOutlineGlobeAlt className="mt-1 h-4 w-4 shrink-0 text-sky-100/90" />
                          <span>
                            {companyProfile.websiteUrl.replace(
                              /^https?:\/\//,
                              '',
                            )}
                          </span>
                        </a>
                      )}
                      {legalInfoLines.map((line) => (
                        <p
                          key={line}
                          className="text-xs leading-5 text-slate-300/90"
                        >
                          {line}
                        </p>
                      ))}
                      {companyProfile.legalLine &&
                        legalInfoLines.length === 0 && (
                          <p className="text-xs leading-5 text-slate-300/90">
                            {companyProfile.legalLine}
                          </p>
                        )}
                      {!companyProfile.legalLine &&
                        companyProfile.brandName && (
                          <p className="text-xs leading-5 text-slate-300/90">
                            {companyProfile.brandName}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10 xl:bg-white/40 xl:backdrop-blur-[2px]">
          <div className="w-full max-w-[36rem] rounded-[32px] border border-white/60 bg-white/78 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8 lg:p-10">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
              {/* Auth Error Alert */}
              {authError && showError && (
                <div className="relative mb-2 w-full rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                  <button
                    onClick={dismissError}
                    className="absolute right-2 top-2 rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
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

              <div className="space-y-6">
                <div className="flex justify-center xl:hidden">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
                    <HiOutlineCheckBadge className="h-4 w-4 text-brand" />
                    {t('text-login-portal-label', {
                      defaultValue: 'B2B Portal',
                    })}
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                    <Logo className="h-16 w-auto sm:h-[4.5rem]" />
                  </div>
                </div>

                <div className="space-y-3 text-center">
                  {branding?.title && (
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {branding.title}
                    </p>
                  )}
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                    {t('text-login-required', {
                      defaultValue: 'Accesso Richiesto',
                    })}
                  </h2>
                  <p className="mx-auto max-w-md text-sm leading-6 text-slate-600 sm:text-[15px]">
                    {t('text-login-required-description', {
                      defaultValue:
                        "Effettua l'accesso per visualizzare questo sito. Se non hai un account, contatta il tuo fornitore.",
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleLogin}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_18px_36px_rgba(37,99,235,0.32)]"
                >
                  {t('text-login', { defaultValue: 'Login' })}
                  <HiArrowRight className="h-4 w-4" />
                </button>

                <p className="text-center text-sm text-slate-500">
                  {t("text-don't-have-account", {
                    defaultValue: "Don't have an account?",
                  })}{' '}
                  <button
                    onClick={handleSignUp}
                    className="font-semibold text-brand underline decoration-2 underline-offset-4 hover:text-brand-dark"
                  >
                    {t('text-create-account', {
                      defaultValue: 'Request access',
                    })}
                  </button>
                </p>
              </div>

              {(branding?.websiteUrl || branding?.shopUrl) && (
                <div className="border-t border-slate-200 pt-5">
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500">
                    {branding?.websiteUrl && (
                      <a
                        href={branding.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-brand"
                      >
                        {t('text-visit-website', {
                          defaultValue: 'Visit Website',
                        })}
                      </a>
                    )}
                    {branding?.websiteUrl && branding?.shopUrl && (
                      <span className="text-slate-300">|</span>
                    )}
                    {branding?.shopUrl && (
                      <a
                        href={branding.shopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-brand"
                      >
                        {t('text-visit-shop', { defaultValue: 'Visit Shop' })}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
