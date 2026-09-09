'use client';

import * as React from 'react';
import { Drawer } from '@components/common/drawer/drawer';
import motionProps from '@components/common/drawer/motion';
import FilterIcon from '@components/icons/filter-icon';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';
import { getDirection } from '@utils/get-direction';
import { IoClose } from 'react-icons/io5';

/**
 * The mobile "Filtri" affordance for the search and collection pages.
 *
 * The facet sidebar is `hidden lg:block`, so below `lg` there was no way to
 * reach the facets at all. This renders the trigger button and the slide-over
 * that holds them.
 *
 * It is the ONLY owner of the shared `displayFilter` flag. That flag lives in
 * the UI context and the drawer portals to `document.body`, so a second
 * component opening on the same flag would stack a second panel on top of this
 * one — the exact shape of the duplicated search overlay we fixed in 2.9.48.
 * Keep it to one owner per page: pass the facet panel in as `children` rather
 * than rendering another drawer somewhere else.
 */
export default function SearchFilterDrawer({
  lang,
  children,
}: {
  lang: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation(lang, 'common');
  const { displayFilter, openFilter, closeFilter } = useUI();
  const dir = getDirection(lang);
  const contentWrapperCSS = dir === 'ltr' ? { left: 0 } : { right: 0 };

  // Mount the panel body only once the drawer has been opened, then keep it —
  // the sidebar copy is already mounted on desktop, and mounting a second
  // facet tree on every page load would double the facet render work for
  // phone users who never open it. Keeping it after the first open lets the
  // close animation play against real content instead of an empty panel.
  const [hasOpened, setHasOpened] = React.useState(false);
  React.useEffect(() => {
    if (displayFilter) setHasOpened(true);
  }, [displayFilter]);

  // Growing past `lg` reveals the real sidebar. Without this the drawer would
  // stay open on top of it, showing the same facets twice.
  React.useEffect(() => {
    if (!displayFilter) return;
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    if (mq.matches) {
      closeFilter();
      return;
    }
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) closeFilter();
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [displayFilter, closeFilter]);

  return (
    <>
      <button
        type="button"
        onClick={openFilter}
        aria-haspopup="dialog"
        aria-expanded={displayFilter}
        className="mb-4 flex items-center px-4 py-2 text-sm font-semibold transition duration-200 ease-in-out border rounded-md lg:hidden text-brand-dark border-border-base focus:outline-none hover:border-brand hover:text-brand"
      >
        <FilterIcon />
        <span className="ltr:pl-2.5 rtl:pr-2.5">{t('text-filters')}</span>
      </button>

      <Drawer
        placement={dir === 'rtl' ? 'right' : 'left'}
        open={displayFilter}
        onClose={closeFilter}
        // @ts-ignore -- rc-drawer types don't allow null, but the app passes
        // it everywhere else to opt out of the stacking level behaviour.
        level={null}
        contentWrapperStyle={contentWrapperCSS}
        {...motionProps}
      >
        <div className="flex h-full w-full flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-border-base px-5 py-4">
            <span className="text-base font-semibold text-brand-dark">
              {t('text-filters')}
            </span>
            <button
              type="button"
              onClick={closeFilter}
              aria-label={t('text-close', { defaultValue: 'Chiudi' })}
              className="flex h-8 w-8 items-center justify-center rounded-md text-brand-dark transition-opacity hover:opacity-60 focus:outline-none"
            >
              <IoClose size={20} />
            </button>
          </div>

          <div className="min-h-0 grow overflow-y-auto px-4 py-4">
            {hasOpened ? children : null}
          </div>

          <div className="shrink-0 border-t border-border-base p-4">
            <button
              type="button"
              onClick={closeFilter}
              className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none"
            >
              {t('text-show-results', { defaultValue: 'Vedi risultati' })}
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
