'use client';

import { useEffect, useState } from 'react';
import { useUI } from '@contexts/ui.context';
import { useModalAction } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import Logo from '@components/ui/logo';

interface AuthGuardProps {
  children: React.ReactNode;
  lang: string;
}

const REQUIRE_LOGIN = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true';

/**
 * AuthGuard - Blocks access to the app if NEXT_PUBLIC_REQUIRE_LOGIN=true
 * and user is not authenticated. Shows login modal automatically.
 */
export default function AuthGuard({ children, lang }: AuthGuardProps) {
  const { isAuthorized } = useUI();
  const { openModal } = useModalAction();
  const { t } = useTranslation(lang, 'common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Auto-open login modal when not authorized and login is required
    if (mounted && REQUIRE_LOGIN && !isAuthorized) {
      openModal('LOGIN_VIEW');
    }
  }, [mounted, isAuthorized, openModal]);

  // During SSR or initial hydration, show nothing to prevent flash
  if (!mounted) {
    return null;
  }

  // If login not required, show content
  if (!REQUIRE_LOGIN) {
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
          {t("text-don't-have-account", { defaultValue: "Don't have an account?" })}{' '}
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
