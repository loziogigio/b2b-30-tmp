'use client';

import { useState, useEffect } from 'react';
import Link from '@components/ui/link';
import SearchIcon from '@components/icons/search-icon';
import UserIcon from '@components/icons/user-icon';
import HomeIcon from '@components/icons/home-icon';
import { useUI } from '@contexts/ui.context';
import { ROUTES } from '@utils/routes';
import dynamic from 'next/dynamic';
import { useModalAction } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import { HiOutlineViewGrid } from 'react-icons/hi';

const CartButton = dynamic(() => import('@components/cart/cart-button'), {
  ssr: false,
});
const B2BHeaderMenu = dynamic(() => import('@layouts/header/b2b-header-menu'), {
  ssr: false,
});

export default function BottomNavigation({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const {
    toggleMobileSearch,
    isAuthorized,
    displayCategories,
    closeCategories,
    openCategories,
  } = useUI();
  const { openModal } = useModalAction();

  // Prevent hydration mismatch - isAuthorized depends on localStorage
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  function handleLogin() {
    openModal('LOGIN_VIEW');
  }

  return (
    <>
      <div className="lg:hidden fixed z-30 -bottom-0.5 flex items-center justify-between shadow-bottomNavigation body-font bg-brand-light w-full h-14 px-4 md:px-6 lg:px-8 text-brand-muted pb-0.5">
        <button
          aria-label={t('text-categories', { defaultValue: 'Categorie' })}
          className="flex flex-col items-center justify-center outline-none shrink-0 focus:outline-none"
          onClick={openCategories}
        >
          <HiOutlineViewGrid className="w-[22px] h-[22px]" />
        </button>
        <button
          className="relative flex items-center justify-center h-auto shrink-0 focus:outline-none"
          onClick={toggleMobileSearch}
          aria-label="Search Button"
        >
          <SearchIcon />
        </button>
        <Link href={`/${lang}${ROUTES.HOME}`} className="shrink-0">
          <span className="sr-only">{t('breadcrumb-home')}</span>
          <HomeIcon />
        </Link>
        {/* Auth-dependent content - only render after mount to avoid hydration mismatch */}
        {mounted && isAuthorized ? (
          <>
            <CartButton
              hideLabel={true}
              iconClassName="text-opacity-100"
              lang={lang}
            />
            <Link
              href={`/${lang}${ROUTES.ACCOUNT}`}
              className="shrink-0 focus:outline-none"
            >
              <UserIcon />
            </Link>
          </>
        ) : (
          <button
            className="shrink-0 focus:outline-none"
            onClick={handleLogin}
            aria-label={t('text-sign-in', { defaultValue: 'Accedi' })}
          >
            <UserIcon />
          </button>
        )}
      </div>

      {/* Categories Menu - controlled via UI context */}
      <B2BHeaderMenu
        lang={lang}
        open={displayCategories}
        onOpenChange={(open) => (open ? openCategories() : closeCategories())}
      />
    </>
  );
}
