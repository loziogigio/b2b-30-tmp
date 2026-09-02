'use client';

import React from 'react';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import TimeDrawerShell from './time-drawer-shell';
import TimeVariantsGrid from './time-variants-grid';

export default function TimeVariantsQuickView({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data } = useModalState();
  const { closeModal } = useModalAction();

  const product = (data as any)?.product ?? data;

  return (
    <TimeDrawerShell
      lang={lang}
      title={t('text-product-variants', {
        defaultValue: 'Anteprima varianti prodotto',
      })}
    >
      <TimeVariantsGrid
        lang={lang}
        product={product}
        onBrandClick={() => closeModal()}
      />
    </TimeDrawerShell>
  );
}
