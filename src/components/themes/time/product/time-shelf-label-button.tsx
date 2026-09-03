'use client';

import React from 'react';
import { IoBarcodeOutline } from 'react-icons/io5';
import { useModalAction } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';

/**
 * Opens the shelf-label / barcode viewer for one article, styled for the time
 * theme's action rows.
 *
 * Renders NOTHING without an EAN: the label is the barcode, so there is no
 * degraded version worth offering. Callers are responsible for passing an EAN
 * that really belongs to `sku` — see the note in time-product-detail.
 *
 * `size` matches the two action rows that host it: the detail page's 38px
 * buttons and the quick-view popup's slightly tighter 36px ones.
 */
export default function TimeShelfLabelButton({
  lang,
  name,
  sku,
  ean,
  size = 'default',
}: {
  lang: string;
  name: string;
  sku: string;
  ean: string;
  size?: 'default' | 'compact';
}) {
  const { t } = useTranslation(lang, 'common');
  const { openModal } = useModalAction();

  const code = (ean ?? '').trim();
  if (!code) return null;

  const label = t('text-shelf-label', { defaultValue: 'Etichetta scaffale' });

  const sizing =
    size === 'compact'
      ? 'h-[36px] px-3 rounded-[8px] text-[11px] sm:text-xs gap-[6px]'
      : 'h-[38px] px-3.5 rounded-[9px] text-xs sm:text-[13px] gap-[7px]';

  return (
    <button
      type="button"
      title={label}
      onClick={() => openModal('SHELF_LABEL_VIEW', { name, sku, ean: code })}
      className={`${sizing} border-[1.5px] border-[var(--time-gray-200)] bg-white font-semibold text-[var(--time-gray-600)] flex items-center cursor-pointer transition-colors hover:border-[var(--time-gray-400)] font-[family-name:var(--font-body)]`}
    >
      <IoBarcodeOutline size={size === 'compact' ? 14 : 16} />
      {label}
    </button>
  );
}
