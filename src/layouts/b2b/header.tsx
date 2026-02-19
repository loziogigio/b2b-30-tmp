'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from '@components/ui/link';
import Container from '@components/ui/container';
import Logo from '@components/ui/logo';
import SearchB2B from '@components/common/search-b2b';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';
import { useLikes } from '@contexts/likes/likes.context';
import { useCompareList } from '@/contexts/compare/compare.context';
import { ROUTES } from '@utils/routes';
import { siteSettings } from '@settings/site-settings';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { useModalAction } from '@components/common/modal/modal.context';
import { useRouter } from 'next/navigation';
import cn from 'classnames';
import {
  HiOutlineHeart,
  HiOutlineUserCircle,
  HiOutlineMenuAlt3,
  HiOutlineArrowUp,
  HiOutlineSwitchHorizontal,
  HiOutlineLogin,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';
import { RadioWidget } from '@layouts/header/widgets/radio-widget';
import AppLauncher from '@layouts/header/app-launcher';
import type { WidgetConfig } from '@/lib/home-settings/types';

const Delivery = dynamic(() => import('@layouts/header/delivery'), {
  ssr: false,
});
const CartButton = dynamic(() => import('@components/cart/cart-button'), {
  ssr: false,
});
const B2BHeaderMenu = dynamic(() => import('@layouts/header/b2b-header-menu'), {
  ssr: false,
});

const promoButtons = [
  {
    label: 'Promozioni',
    color: 'bg-[#a52a2a] text-white',
    href: '/search?filters-has_active_promo=true',
  },
  {
    label: 'Nuovi arrivi',
    color: 'bg-brand text-white',
    href: '/search?filters-attribute_is_new_b=true',
  },
  // Outlet hidden for now
  // {
  //   label: 'Outlet',
  //   color: 'bg-emerald-600 text-white',
  //   href: '/search?filters-collection_slugs=outlet',
  // },
];

const quickLinks = [
  { label: 'i miei ordini', href: '/account/orders' },
  { label: 'i miei documenti', href: '/account/documents' },
];

interface HeaderProps {
  lang: string;
}

function Header({ lang }: HeaderProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized, hidePrices, toggleHidePrices } = useUI();
  const { summary } = useLikes();
  const { skus: compareSkus } = useCompareList();
  const router = useRouter();
  const { openModal } = useModalAction();
  const { settings } = useHomeSettings();
  const brandingTitle = useMemo(
    () =>
      settings?.branding?.title ||
      siteSettings?.site_header?.title ||
      'VINC B2B',
    [settings?.branding?.title],
  );

  // Get radio widget config from header settings
  const radioConfig = useMemo<WidgetConfig>(() => {
    const rows = settings?.headerConfig?.rows || [];
    for (const row of rows) {
      for (const block of row.blocks || []) {
        for (const widget of block.widgets || []) {
          if (widget.type === 'radio-widget') {
            return widget.config || {};
          }
        }
      }
    }
    return { enabled: true }; // Default: show radio
  }, [settings?.headerConfig]);

  const [isElevated, setIsElevated] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY || 0;
      setIsElevated(y > 10);
      setShowScrollTop(y > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAccount = () => {
    if (isAuthorized) {
      router.push(`/${lang}/account/profile`);
    } else {
      openModal('LOGIN_VIEW');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div
        className={cn(
          'md:sticky md:top-0 z-30 border-b border-slate-200 bg-white transition-shadow',
          isElevated && 'shadow-sm',
        )}
      >
        <Container className="flex items-stretch h-16 pt-2">
          {/* Left - Logo (flexible width on mobile, fixed on desktop) */}
          <div className="flex-1 lg:flex-none lg:w-[20%] flex items-center">
            <Logo className="h-12 w-auto" />
          </div>

          {/* Mobile icons - show all when logged in, login icon when not */}
          <div className="flex items-center gap-2 lg:hidden">
            <AppLauncher />
            {isAuthorized ? (
              <>
                <button
                  type="button"
                  onClick={toggleHidePrices}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand text-slate-600 shrink-0"
                  aria-label={
                    hidePrices
                      ? t('text-show-prices', { defaultValue: 'Show prices' })
                      : t('text-hide-prices', { defaultValue: 'Hide prices' })
                  }
                  title={
                    hidePrices
                      ? t('text-show-prices', { defaultValue: 'Show prices' })
                      : t('text-hide-prices', { defaultValue: 'Hide prices' })
                  }
                >
                  {hidePrices ? (
                    <HiOutlineEyeOff className="h-4 w-4" />
                  ) : (
                    <HiOutlineEye className="h-4 w-4" />
                  )}
                </button>

                <Link
                  href={`/${lang}/search?source=likes&page_size=12`}
                  aria-label={t('text-wishlist', { defaultValue: 'Wishlist' })}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand text-slate-600 shrink-0"
                >
                  <HiOutlineHeart className="h-4 w-4" />
                  {summary?.totalCount ? (
                    <span className="absolute -top-1 -right-1 rounded-full bg-[#E1E7EE] px-1 text-[9px] font-semibold text-black">
                      {summary.totalCount}
                    </span>
                  ) : null}
                </Link>

                <Link
                  href={`/${lang}${ROUTES.PRODUCT_COMPARE}`}
                  aria-label="Product compare"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand text-slate-600 shrink-0"
                >
                  <HiOutlineSwitchHorizontal className="h-4 w-4" />
                  {compareSkus.length ? (
                    <span className="absolute -top-1 -right-1 rounded-full bg-[#E1E7EE] px-1 text-[9px] font-semibold text-black">
                      {compareSkus.length}
                    </span>
                  ) : null}
                </Link>

                <button
                  type="button"
                  onClick={handleAccount}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand bg-brand text-white shadow-md hover:bg-white hover:text-brand"
                  aria-label={t('text-account', { defaultValue: 'Account' })}
                >
                  <HiOutlineUserCircle className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAccount}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand text-slate-600"
                aria-label={t('text-sign-in', { defaultValue: 'Sign in' })}
              >
                <HiOutlineLogin className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Center 60% - Search + Radio (hidden on mobile) */}
          <div className="hidden lg:flex lg:w-[60%] items-center justify-center gap-3 px-4">
            <div className="w-full">
              <Suspense fallback={null}>
                <SearchB2B
                  searchId="vinc-main-search"
                  className="w-full h-12"
                  lang={lang}
                />
              </Suspense>
            </div>

            <RadioWidget config={radioConfig} lang={lang} />
          </div>

          {/* Right - Buttons (hidden on mobile, shown on desktop) */}
          <div className="hidden lg:flex lg:w-[20%] items-center justify-end gap-4 text-slate-600">
            <AppLauncher />
            {isAuthorized ? (
              <>
                <div className="flex flex-col items-center group">
                  <button
                    type="button"
                    onClick={toggleHidePrices}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand shrink-0"
                    title={
                      hidePrices
                        ? t('text-show-prices-tooltip', {
                            defaultValue:
                              'Clicca per mostrare i prezzi dei prodotti',
                          })
                        : t('text-hide-prices-tooltip', {
                            defaultValue:
                              'Clicca per nascondere i prezzi dei prodotti',
                          })
                    }
                  >
                    {hidePrices ? (
                      <HiOutlineEyeOff className="h-5 w-5" />
                    ) : (
                      <HiOutlineEye className="h-5 w-5" />
                    )}
                  </button>
                  <span className="mt-1 text-[10px] text-slate-500">
                    {hidePrices ? 'Mostra' : 'No prezzi'}
                  </span>
                </div>

                <div className="flex flex-col items-center group">
                  <Link
                    href={`/${lang}/search?source=likes&page_size=12`}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand shrink-0"
                    title={t('text-wishlist-tooltip', {
                      defaultValue: 'I tuoi prodotti preferiti salvati',
                    })}
                  >
                    <HiOutlineHeart className="h-5 w-5" />
                    {summary?.totalCount ? (
                      <span className="absolute -top-1 -right-1 rounded-full bg-[#E1E7EE] px-1.5 text-[10px] font-semibold text-black">
                        {summary.totalCount}
                      </span>
                    ) : null}
                  </Link>
                  <span className="mt-1 text-[10px] text-slate-500">
                    Preferiti
                  </span>
                </div>

                <div className="flex flex-col items-center group">
                  <Link
                    href={`/${lang}${ROUTES.PRODUCT_COMPARE}`}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand shrink-0"
                    title={t('text-compare-tooltip', {
                      defaultValue: 'Confronta prodotti fianco a fianco',
                    })}
                  >
                    <HiOutlineSwitchHorizontal className="h-5 w-5" />
                    {compareSkus.length ? (
                      <span className="absolute -top-1 -right-1 rounded-full bg-[#E1E7EE] px-1.5 text-[10px] font-semibold text-black">
                        {compareSkus.length}
                      </span>
                    ) : null}
                  </Link>
                  <span className="mt-1 text-[10px] text-slate-500">
                    Confronta
                  </span>
                </div>

                <div className="flex flex-col items-center group">
                  <button
                    type="button"
                    onClick={handleAccount}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand bg-brand text-white shadow-md hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    title={t('text-account-tooltip', {
                      defaultValue: 'Gestisci il tuo profilo e le impostazioni',
                    })}
                  >
                    <HiOutlineUserCircle className="h-5 w-5" />
                  </button>
                  <span className="mt-1 text-[10px] text-slate-500">
                    Profilo
                  </span>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openModal('LOGIN_VIEW')}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 transition-colors"
              >
                <HiOutlineLogin className="h-5 w-5" />
                <span>{t('text-sign-in', { defaultValue: 'Accedi' })}</span>
              </button>
            )}
          </div>
        </Container>
      </div>

      {/* Second header bar - navigation always visible, account features only when logged in */}
      <header className="md:sticky md:top-16 z-20 border-b border-slate-200 bg-white text-slate-900">
        <div className="bg-white">
          <Container className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm font-medium">
            {/* Left side - always visible */}
            <div className="flex flex-wrap items-center gap-3">
              <B2BHeaderMenu
                lang={lang}
                renderTrigger={({ onClick }) => (
                  <button
                    type="button"
                    onClick={onClick}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <HiOutlineMenuAlt3 className="h-5 w-5" />
                    <span>Categorie</span>
                  </button>
                )}
              />

              {promoButtons.map((btn) => (
                <Link
                  key={btn.label}
                  href={`/${lang}${btn.href}`}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold shadow-sm',
                    btn.color,
                  )}
                >
                  {btn.label}
                </Link>
              ))}
            </div>

            {/* Right side - only show when logged in */}
            {isAuthorized && (
              <div className="hidden lg:flex flex-wrap items-center gap-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={`/${lang}${link.href}`}
                    className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:border-brand hover:text-brand"
                  >
                    {link.label}
                  </Link>
                ))}
                <Suspense fallback={null}>
                  <Delivery lang={lang} />
                </Suspense>
                <CartButton
                  lang={lang}
                  summaryVariant="amount"
                  className="ml-3"
                />
              </div>
            )}
          </Container>
        </div>
      </header>

      {showScrollTop ? (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label={t('text-scroll-to-top', {
            defaultValue: 'Scroll to top',
          })}
        >
          <HiOutlineArrowUp className="h-4 w-4" />
          <span>{t('text-top', { defaultValue: 'Top' })}</span>
        </button>
      ) : null}
    </>
  );
}

export default Header;
