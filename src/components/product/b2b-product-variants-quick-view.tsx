// components/product/b2b-product-variants-quick-view.tsx
'use client';

import cn from 'classnames';
import { IoClose, IoChevronBack } from 'react-icons/io5';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import { isModalFullWidth } from '@/lib/theme/resolver';
import B2BVariantsGridContent from './b2b-variants-grid-content';

export default function B2BProductVariantsQuickView({
  lang,
}: {
  lang: string;
}) {
  const { t } = useTranslation(lang, 'common');
  const { data, stack } = useModalState();
  const { closeModal, goBack } = useModalAction();

  const product = (data as any)?.product ?? data;
  const fullWidth = isModalFullWidth();

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Accent bar */}
      <div className="sticky top-0 z-20 bg-brand text-white shrink-0">
        <div
          className={cn(
            'flex items-center justify-between px-4 md:px-6 lg:px-8 2xl:px-10 py-3',
            !fullWidth && 'max-w-[1440px] mx-auto',
          )}
        >
          <button
            onClick={() => (stack.length > 1 ? goBack() : closeModal())}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer"
          >
            <IoChevronBack size={16} />
            {t('text-go-back', { defaultValue: 'Torna indietro' })}
          </button>
          <button
            onClick={closeModal}
            aria-label="Close"
            className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
          >
            <IoClose size={18} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'w-full flex-1 overflow-hidden flex flex-col',
          !fullWidth && 'max-w-[1440px] mx-auto',
        )}
      >
        <B2BVariantsGridContent
          lang={lang}
          product={product}
          useWindowScroll={false}
          onBrandClick={() => closeModal()}
        />
      </div>
    </div>
  );
}
