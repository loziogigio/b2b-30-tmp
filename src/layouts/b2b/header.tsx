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
  HiOutlineSwitchHorizontal
} from 'react-icons/hi';

const Delivery = dynamic(() => import('@layouts/header/delivery'), { ssr: false });
const CartButton = dynamic(() => import('@components/cart/cart-button'), { ssr: false });
const B2BHeaderMenu = dynamic(() => import('@layouts/header/b2b-header-menu'), { ssr: false });

const promoButtons = [
  { label: 'Promozioni', color: 'bg-[#a52a2a] text-white', href: '/search?filters-has_active_promo=true' },
  { label: 'Novità', color: 'bg-brand text-white', href: '/search?filters-is_new=true' },
];

const quickLinks = [
  { label: 'i miei ordini', href: '/account/orders' },
  { label: 'confronta', href: ROUTES.PRODUCT_COMPARE },
  { label: 'importa', href: ROUTES.BUNDLE },
];

interface HeaderProps {
  lang: string;
}

function Header({ lang }: HeaderProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { summary } = useLikes();
  const { skus: compareSkus } = useCompareList();
  const router = useRouter();
  const { openModal } = useModalAction();
  const { settings } = useHomeSettings();
  const brandingTitle = useMemo(
    () => settings?.branding?.title || siteSettings?.site_header?.title || 'Hidros',
    [settings?.branding?.title]
  );

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
          'sticky top-0 z-40 border-b border-slate-200 bg-white transition-shadow',
          isElevated && 'shadow-sm'
        )}
      >
        <Container className="flex items-stretch h-16">
          {/* Left 20% - Logo */}
          <div className="w-[20%] flex items-center">
            <Logo className="h-12 w-auto" />
          </div>

          {/* Center 60% - Search + Radio */}
          <div className="w-[60%] flex items-center justify-center gap-3 px-4">
            <div className="w-full">
              <Suspense fallback={null}>
                <SearchB2B
                  searchId="hidros-main-search"
                  className="w-full h-12"
                  lang={lang}
                />
              </Suspense>
            </div>

            <button
              type="button"
              onClick={() => {
                window.open(
                  '/radio-player.html',
                  'RadioPlayer',
                  'width=450,height=500,resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no,location=no'
                );
              }}
              className="shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="Ascolta la radio"
            >
              <img
                src="/assets/placeholders/radio_icon.png"
                alt="RTL 102.5"
                className="h-10 w-auto"
              />
            </button>
          </div>

          {/* Right 20% - Buttons */}
          <div className="w-[20%] flex items-center justify-end gap-3 text-slate-600">
            <Link
              href={`/${lang}/search?source=likes&page_size=12`}
              aria-label={t('text-wishlist', { defaultValue: 'Wishlist' })}
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand shrink-0"
            >
              <HiOutlineHeart className="h-5 w-5" />
              {summary?.totalCount ? (
                <span className="absolute -top-1 -right-1 rounded-full bg-[#E1E7EE] px-1.5 text-[10px] font-semibold text-black">
                  {summary.totalCount}
                </span>
              ) : null}
            </Link>

            <Link
              href={`/${lang}${ROUTES.PRODUCT_COMPARE}`}
              aria-label="Product compare"
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand shrink-0"
            >
              <HiOutlineSwitchHorizontal className="h-5 w-5" />
              {compareSkus.length ? (
                <span className="absolute -top-1 -right-1 rounded-full bg-[#E1E7EE] px-1.5 text-[10px] font-semibold text-black">
                  {compareSkus.length}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              onClick={handleAccount}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label={isAuthorized ? t('text-account') : t('text-sign-in')}
            >
              <HiOutlineUserCircle className="h-6 w-6" />
            </button>
          </div>
        </Container>
      </div>

      <header className="border-b border-slate-200 bg-white text-slate-900">
        <div className="bg-white border-b border-slate-200">
          <Container className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm font-medium">
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
                  className={cn('rounded-full px-4 py-2 text-sm font-semibold shadow-sm', btn.color)}
                >
                  {btn.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
              <CartButton lang={lang} summaryVariant="amount" className="ml-3" />
            </div>
          </Container>
        </div>
      </header>

      {showScrollTop ? (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label={t('text-scroll-to-top', { defaultValue: 'Scroll to top' })}
        >
          <HiOutlineArrowUp className="h-4 w-4" />
          <span>{t('text-top', { defaultValue: 'Top' })}</span>
        </button>
      ) : null}
    </>
  );
}

export default Header;
