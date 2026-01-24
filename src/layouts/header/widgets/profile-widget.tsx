'use client';

import { useRouter } from 'next/navigation';
import { HiOutlineUserCircle, HiOutlineLogin } from 'react-icons/hi';
import { useUI } from '@contexts/ui.context';
import { useModalAction } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface ProfileWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function ProfileWidget({ config, lang }: ProfileWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { openModal } = useModalAction();
  const router = useRouter();

  const handleAccount = () => {
    if (isAuthorized) {
      router.push(`/${lang}/account/profile`);
    } else {
      openModal('LOGIN_VIEW');
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
      onClick={() => openModal('LOGIN_VIEW')}
      className="hidden lg:inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 transition-colors"
      title={t('text-sign-in', { defaultValue: 'Accedi' })}
    >
      <HiOutlineLogin className="h-5 w-5" />
      <span>{t('text-sign-in', { defaultValue: 'Accedi' })}</span>
    </button>
  );
}
