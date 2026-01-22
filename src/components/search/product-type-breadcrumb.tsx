'use client';

import { IoClose } from 'react-icons/io5';
import { useTranslation } from 'src/app/i18n/client';

interface Props {
  lang: string;
  productType: string | null;
  label: string;
  onClear: () => void;
}

export const ProductTypeBreadcrumb = ({
  lang,
  productType,
  label,
  onClear,
}: Props) => {
  const { t } = useTranslation(lang, 'common');

  if (!productType) return null;

  return (
    <div className="mb-4 p-3 bg-brand/5 rounded-lg border border-brand/20">
      <div className="text-xs text-brand-muted mb-1">
        {t('text-product-type')}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-brand-dark truncate">{label}</span>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 p-1 rounded hover:bg-brand/10 transition"
          aria-label={t('text-clear')}
        >
          <IoClose className="w-4 h-4 text-brand-muted" />
        </button>
      </div>
    </div>
  );
};
