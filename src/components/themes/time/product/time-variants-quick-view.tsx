'use client';

import React from 'react';
import cn from 'classnames';
import { IoClose, IoChevronBack } from 'react-icons/io5';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import TimeVariantsGrid from './time-variants-grid';

export default function TimeVariantsQuickView({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data, stack } = useModalState();
  const { closeModal, goBack } = useModalAction();

  const product = (data as any)?.product ?? data;
  const fullWidth = true;

  return (
    <div className="h-full overflow-y-auto bg-white relative">
      {/* Accent bar */}
      <div className="sticky top-0 z-20 bg-brand text-white">
        <div
          className={cn(
            'flex items-center justify-between px-5 md:px-8 lg:px-10 py-3',
            !fullWidth && 'max-w-[1200px] mx-auto',
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => (stack.length > 1 ? goBack() : closeModal())}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              <IoChevronBack size={16} />
              {t('text-go-back', { defaultValue: 'Torna indietro' })}
            </button>
            <span className="hidden sm:inline text-white/40">|</span>
            <span className="hidden sm:inline text-white/90 text-sm font-medium">
              {t('text-product-variants', {
                defaultValue: 'Anteprima varianti prodotto',
              })}
            </span>
          </div>
          <button
            onClick={closeModal}
            aria-label="Close"
            className="inline-flex items-center gap-2 bg-white text-[var(--time-red)] hover:bg-[var(--time-dark)] hover:text-white font-bold uppercase tracking-wide text-sm rounded-full px-4 py-2 shadow-lg ring-2 ring-white/80 transition-all cursor-pointer"
          >
            <IoClose size={20} strokeWidth={3} />
            <span className="hidden sm:inline">
              {t('text-close', { defaultValue: 'Chiudi' })}
            </span>
          </button>
        </div>
      </div>

      <div
        className={cn(
          'p-5 md:p-8 lg:p-10',
          !fullWidth && 'max-w-[1200px] mx-auto',
        )}
      >
        <TimeVariantsGrid
          lang={lang}
          product={product}
          onBrandClick={() => closeModal()}
        />
      </div>
    </div>
  );
}
