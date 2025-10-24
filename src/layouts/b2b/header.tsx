'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from '@components/ui/link';
import Container from '@components/ui/container';
import Logo from '@components/ui/logo';
import SearchB2B from '@components/common/search-b2b';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';
import { ROUTES } from '@utils/routes';
import { siteSettings } from '@settings/site-settings';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { useModalAction } from '@components/common/modal/modal.context';
import { useRouter } from 'next/navigation';
import cn from 'classnames';
import {
  HiOutlineHeart,
  HiOutlineViewGrid,
  HiOutlineUserCircle,
  HiOutlineMenuAlt3,
  HiOutlineArrowUp,
} from 'react-icons/hi';

const Delivery = dynamic(() => import('@layouts/header/delivery'), { ssr: false });
const CartButton = dynamic(() => import('@components/cart/cart-button'), { ssr: false });
const B2BHeaderMenu = dynamic(() => import('@layouts/header/b2b-header-menu'), { ssr: false });

const promoButtons = [
  { label: 'Promozioni', color: 'bg-[#a52a2a] text-white', href: '/search?filters-promo_type=all' },
  { label: 'Novità', color: 'bg-brand text-white', href: '/search?filters-new=true' },
];

const quickLinks = [
  { label: 'i miei ordini', href: '/account/orders' },
  { label: 'confronta', href: ROUTES.PRODUCTS },
  { label: 'importa', href: ROUTES.BUNDLE },
];

interface HeaderProps {
  lang: string;
}

function Header({ lang }: HeaderProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
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
        <Container className="flex items-center gap-3 py-3">
          <div className="flex items-center shrink-0">
            <Logo className="h-14 w-auto" />
          </div>

          <div className="flex items-center justify-center gap-3 flex-1">
            <div className="w-full max-w-2xl">
              <Suspense fallback={null}>
                <SearchB2B
                  searchId="hidros-main-search"
                  className="w-full h-12"
                  lang={lang}
                />
              </Suspense>
            </div>

            <Link
              href={`/${lang}/search?source=likes&page_size=12`}
              aria-label={t('text-wishlist', { defaultValue: 'Wishlist' })}
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand shrink-0"
            >
              <HiOutlineHeart className="h-5 w-5" />
            </Link>
          </div>

          <div className="flex h-14 items-center gap-4 text-slate-600 shrink-0">
            <div className="hidden lg:flex flex-col items-end justify-center leading-tight">
              <Suspense fallback={null}>
                <Delivery lang={lang} />
              </Suspense>
            </div>

            <button
              type="button"
              onClick={handleAccount}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label={isAuthorized ? t('text-account') : t('text-sign-in')}
            >
              <HiOutlineUserCircle className="h-6 w-6" />
            </button>

            <Link
              href={`/${lang}${ROUTES.SHOPS}`}
              aria-label="Catalog grid"
              className="hidden sm:inline-flex h-12 w-12 items-center justify-center hover:text-brand"
            >
              <HiOutlineViewGrid className="h-5 w-5" />
            </Link>
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
