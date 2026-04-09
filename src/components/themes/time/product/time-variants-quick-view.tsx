'use client';

import React from 'react';
import cn from 'classnames';
import { IoClose, IoChevronBack } from 'react-icons/io5';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import { isModalFullWidth } from '@/lib/theme/resolver';
import TimeVariantsGrid from './time-variants-grid';

export default function TimeVariantsQuickView({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data, stack } = useModalState();
  const { closeModal, goBack } = useModalAction();

  const product = (data as any)?.product ?? data;
  const fullWidth = isModalFullWidth();

  return (
    <div className="h-full overflow-y-auto bg-white relative">
      {/* Accent bar */}
      <div className="sticky top-0 z-20 bg-brand text-white">
        <div className={cn("flex items-center justify-between px-5 md:px-8 lg:px-10 py-3", !fullWidth && "max-w-[1200px] mx-auto")}>
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
              {t('text-product-variants', { defaultValue: 'Varianti prodotto' })}
            </span>
          </div>
          <button
            onClick={closeModal}
            aria-label="Close"
            className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
          >
            <IoClose size={18} />
          </button>
        </div>
      </div>

      <div className={cn("p-5 md:p-8 lg:p-10", !fullWidth && "max-w-[1200px] mx-auto")}>
        <TimeVariantsGrid
          lang={lang}
          product={product}
          onBrandClick={() => closeModal()}
        />
      </div>
    </div>
  );
}
