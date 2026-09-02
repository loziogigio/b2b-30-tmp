'use client';

import React from 'react';
import cn from 'classnames';
import { IoClose, IoChevronBack } from 'react-icons/io5';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';

/**
 * The time theme's fullscreen drawer chrome: red accent bar with a back pill,
 * a panel title and a close pill, over a scrollable content area.
 *
 * Shared by every drawer in the theme (variants quick view, order history) so
 * they open, stack and dismiss identically. Pushing a drawer on top of another
 * keeps the one underneath on the modal stack, and "torna indietro" pops back
 * to it instead of dismissing everything.
 */
export default function TimeDrawerShell({
  lang,
  title,
  children,
  maxContentWidth,
  contentClassName,
}: {
  lang: string;
  /** Label shown beside the back pill, naming the panel. */
  title?: string;
  children: React.ReactNode;
  /**
   * Caps the content column, in px, for panels whose content should not
   * stretch across the whole drawer (a narrow table, say). The column stays
   * left-aligned with the rest of the panel; it is not centred. Omit to fill
   * the drawer.
   */
  maxContentWidth?: number;
  contentClassName?: string;
}) {
  const { t } = useTranslation(lang, 'common');
  const { stack } = useModalState();
  const { closeModal, goBack } = useModalAction();

  return (
    <div className="h-full overflow-y-auto bg-white relative">
      {/* Accent bar */}
      <div className="sticky top-0 z-20 bg-brand text-white">
        <div className="flex items-center justify-between px-5 md:px-8 lg:px-10 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => (stack.length > 1 ? goBack() : closeModal())}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer shrink-0"
            >
              <IoChevronBack size={16} />
              {t('text-go-back', { defaultValue: 'Torna indietro' })}
            </button>
            {title && (
              <>
                <span className="hidden sm:inline text-white/40">|</span>
                <span className="hidden sm:inline text-white/90 text-sm font-medium truncate">
                  {title}
                </span>
              </>
            )}
          </div>
          <button
            onClick={closeModal}
            aria-label={t('text-close', { defaultValue: 'Chiudi' })}
            className="inline-flex items-center gap-2 bg-white text-[var(--time-red)] hover:bg-[var(--time-dark)] hover:text-white font-bold uppercase tracking-wide text-sm rounded-full px-4 py-2 shadow-lg ring-2 ring-white/80 transition-all cursor-pointer shrink-0"
          >
            <IoClose size={20} strokeWidth={3} />
            <span className="hidden sm:inline">
              {t('text-close', { defaultValue: 'Chiudi' })}
            </span>
          </button>
        </div>
      </div>

      <div
        data-drawer-content
        style={
          maxContentWidth ? { maxWidth: `${maxContentWidth}px` } : undefined
        }
        className={cn('p-5 md:p-8 lg:p-10', contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
