'use client';

import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface NoPriceWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function NoPriceWidget({ config, lang }: NoPriceWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized, hidePrices, toggleHidePrices } = useUI();

  // Only show when logged in
  if (!isAuthorized) return null;

  return (
    <div className="flex flex-col items-center group">
      <button
        type="button"
        onClick={toggleHidePrices}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand shrink-0"
        title={
          hidePrices
            ? t('text-show-prices-tooltip', {
                defaultValue: 'Clicca per mostrare i prezzi dei prodotti',
              })
            : t('text-hide-prices-tooltip', {
                defaultValue: 'Clicca per nascondere i prezzi dei prodotti',
              })
        }
      >
        {hidePrices ? (
          <HiOutlineEyeOff className="h-5 w-5" />
        ) : (
          <HiOutlineEye className="h-5 w-5" />
        )}
      </button>
      {config?.showLabel && (
        <span className="mt-1 text-[10px] text-slate-500">
          {hidePrices ? 'Mostra' : 'No prezzi'}
        </span>
      )}
    </div>
  );
}
