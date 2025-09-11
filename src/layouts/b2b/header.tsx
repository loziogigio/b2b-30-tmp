'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'src/app/i18n/client';
import cn from 'classnames';
import { ROUTES } from '@utils/routes';
import { useUI } from '@contexts/ui.context';
import { ERP_STATIC } from '@framework/utils/static';
import { siteSettings } from '@settings/site-settings';
import Container from '@components/ui/container';
import Logo from '@components/ui/logo';
import B2BHeaderMenu from '@layouts/header/b2b-header-menu';
import SearchB2B from '@components/common/search-b2b';
import LanguageSwitcher from '@components/ui/language-switcher';
import CompanyIcon from '@components/icons/company-icon';
import SearchIcon from '@components/icons/search-icon';
import { useModalAction } from '@components/common/modal/modal.context';
import useOnClickOutside from '@utils/use-click-outside';

const Delivery = dynamic(() => import('@layouts/header/delivery'), { ssr: false });
const AuthMenu = dynamic(() => import('@layouts/header/auth-menu'), { ssr: false });
const CartButton = dynamic(() => import('@components/cart/cart-button'), { ssr: false });

const { site_header } = siteSettings;

function Header({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const {
    displaySearch,
    displayMobileSearch,
    openSearch,
    closeSearch,
    isAuthorized,
  } = useUI();
  const { openModal } = useModalAction();
  const siteHeaderRef = useRef<HTMLDivElement>(null);
  const siteSearchRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(siteSearchRef, () => closeSearch());

  function handleLogin() {
    openModal('LOGIN_VIEW');
  }

  return (
    <>
      <header
        id="siteHeader"
        ref={siteHeaderRef}
        className={cn(
          // Always fixed styling; no scroll-driven changes
          'sticky top-0 z-40 w-full bg-fill-secondary border-b border-gray-100',
          displayMobileSearch && 'active-mobile-search'
        )}
      >
        {/* Top bar: logo + desktop search + actions */}
        <Container className="flex items-center justify-between h-16">
          <Logo className="logo" />

          {/* Desktop search (inline, stable) */}
          <SearchB2B
            searchId="top-bar-search"
            className="hidden lg:flex lg:max-w-[650px] 2xl:max-w-[800px] lg:mx-6"
            lang={lang}
          />

          {/* Right controls */}
          <div className="flex shrink-0 items-center -mx-2.5 xl:-mx-3.5">
            {/* <div className="xl:mx-3.5 mx-2.5">
              <LanguageSwitcher lang={lang} />
            </div> */}

            {/* Compact search trigger for small screens / on-demand */}
            <button
              type="button"
              aria-label="Search Toggle"
              onClick={() => openSearch()}
              title="Search toggle"
              className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 mx-2.5 xl:mx-3.5 lg:hidden"
            >
              <SearchIcon className="w-[22px] h-[22px] text-brand-dark text-opacity-40" />
            </button>

            {isAuthorized ? (
              <CartButton className="mx-2.5 xl:mx-3.5" lang={lang} />
            ) : null}

            <div className="items-center hidden lg:flex shrink-0 mx-2.5 xl:mx-3.5">
              <CompanyIcon className={cn('w-7 h-7 md:w-7 md:h-7 text-opacity-40', isAuthorized ? 'text-brand' : 'text-brand-dark')} />
              <AuthMenu
                isAuthorized={isAuthorized}
                href={`/${lang}${ROUTES.ACCOUNT}`}
                btnProps={{
                  children: t('text-sign-in'),
                  onClick: handleLogin,
                }}
              >
                {isAuthorized && (ERP_STATIC?.company_name || ERP_STATIC?.username)
                  ? (ERP_STATIC.company_name || ERP_STATIC.username)
                  : t('text-account')}
              </AuthMenu>
            </div>
          </div>
        </Container>

        {/* Mobile search (row under top bar) */}
        <div className="hidden border-t border-gray-100">
          <Container>
            <SearchB2B
              searchId="mobile-search"
              className="w-full py-2"
              lang={lang}
            />
          </Container>
        </div>


      </header>
      <div>
        {/* Row below: either MENU or a FULL search row (no absolute overlay) */}
        {displaySearch ? (
          <div className="border-t border-gray-100 bg-fill-secondary">
            <Container className="h-16 flex items-center justify-center">
              <SearchB2B
                ref={siteSearchRef}
                className="w-full max-w-[780px] xl:max-w-[830px] 2xl:max-w-[1000px]"
                lang={lang}
              />
            </Container>
          </div>
        ) : (
          <div className="hidden lg:block border-t border-gray-100 bg-brand-light">
            <Container className="flex items-center justify-between h-14">
              {/* Keep logo space stable on the menu row if needed */}
              <div className="w-0" />
              {/* Main menu (fetches its own data; no data prop) */}
              <B2BHeaderMenu className="flex" lang={lang} />
              <div className="flex items-center ltr:ml-auto rtl:mr-auto shrink-0">
                {isAuthorized ? (
                  <Delivery lang={lang} />
                ) : null}
              </div>
            </Container>
          </div>
        )}
      </div>
    </>
  );
}

export default Header;
