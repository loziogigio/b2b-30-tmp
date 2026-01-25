'use client';

import { useRouter } from 'next/navigation';
import { HiOutlineUserCircle, HiOutlineLogin } from 'react-icons/hi';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';
import { useTenantOptional } from '@contexts/tenant.context';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface ProfileWidgetProps {
  config: WidgetConfig;
  lang: string;
}

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

export function ProfileWidget({ config, lang }: ProfileWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const tenantContext = useTenantOptional();
  const router = useRouter();

  // Get tenant ID
  const tenantId =
    tenantContext?.tenant?.id || process.env.NEXT_PUBLIC_TENANT_ID;

  // Handle SSO login redirect
  const handleLogin = () => {
    const currentUrl =
      typeof window !== 'undefined' ? window.location.href : `/${lang}`;
    const ssoUrl = buildSSOLoginUrl({
      tenantId,
      returnUrl: currentUrl,
      lang,
    });
    window.location.href = ssoUrl;
  };

  const handleAccount = () => {
    if (isAuthorized) {
      router.push(`/${lang}/account/profile`);
    } else {
      handleLogin();
    }
  };

  // Hide when bottom navigation is visible (below lg breakpoint)
  if (isAuthorized) {
    return (
      <div className="hidden lg:flex flex-col items-center group">
        <button
          type="button"
          onClick={handleAccount}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand bg-brand text-white shadow-md hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          title={t('text-account-tooltip', {
            defaultValue: 'Gestisci il tuo profilo e le impostazioni',
          })}
        >
          <HiOutlineUserCircle className="h-5 w-5" />
        </button>
        {config?.showLabel && (
          <span className="mt-1 text-[10px] text-slate-500">Profilo</span>
        )}
      </div>
    );
  }

  // Hide when bottom navigation is visible (below lg breakpoint)
  return (
    <button
      type="button"
      onClick={handleLogin}
      className="hidden lg:inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 transition-colors"
      title={t('text-sign-in', { defaultValue: 'Accedi' })}
    >
      <HiOutlineLogin className="h-5 w-5" />
      <span>{t('text-sign-in', { defaultValue: 'Accedi' })}</span>
    </button>
  );
}
