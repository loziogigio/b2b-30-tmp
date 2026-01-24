'use client';

import Link from '@components/ui/link';
import { HiOutlineSwitchHorizontal } from 'react-icons/hi';
import { useUI } from '@contexts/ui.context';
import { useCompareList } from '@/contexts/compare/compare.context';
import { useTranslation } from 'src/app/i18n/client';
import { ROUTES } from '@utils/routes';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface CompareWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function CompareWidget({ config, lang }: CompareWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { skus: compareSkus } = useCompareList();

  // Only show when logged in
  if (!isAuthorized) return null;

  return (
    <div className="flex flex-col items-center group">
      <Link
        href={`/${lang}${ROUTES.PRODUCT_COMPARE}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand shrink-0"
        title={t('text-compare-tooltip', {
          defaultValue: 'Confronta prodotti fianco a fianco',
        })}
      >
        <HiOutlineSwitchHorizontal className="h-5 w-5" />
        {compareSkus.length ? (
          <span className="absolute -top-1 -right-1 rounded-full bg-[#E1E7EE] px-1.5 text-[10px] font-semibold text-black">
            {compareSkus.length}
          </span>
        ) : null}
      </Link>
      {config?.showLabel && (
        <span className="mt-1 text-[10px] text-slate-500">Confronta</span>
      )}
    </div>
  );
}
