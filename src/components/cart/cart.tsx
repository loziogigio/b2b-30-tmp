'use client';

import Scrollbar from '@components/ui/scrollbar';
import { useCart } from '@contexts/cart/cart.context';
import { useUI } from '@contexts/ui.context';
import usePrice from '@framework/product/use-price';
import { IoClose } from 'react-icons/io5';
import CartItem from './cart-item';
import EmptyCart from './empty-cart';
import Link from '@components/ui/link';
import { ROUTES } from '@utils/routes';
import cn from 'classnames';
import Heading from '@components/ui/heading';
import Text from '@components/ui/text';
import DeleteIcon from '@components/icons/delete-icon';
import { useTranslation } from 'src/app/i18n/client';

export default function Cart({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { closeDrawer } = useUI();
  const { items, total, isEmpty, resetCart } = useCart();
  const { price: cartTotal } = usePrice({ amount: total, currencyCode: 'EUR' });

  return (
    <div className="flex h-full w-full flex-col">
      {/* header — compact, pill style like screenshot */}
      <div className="sticky top-0 z-10 bg-white border-b border-border-base px-4 py-2 md:px-5 md:py-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={closeDrawer}
            className={cn(
              'inline-flex items-center gap-2 rounded-md bg-gray-200 px-2.5 py-1',
              'text-[11px] font-semibold uppercase tracking-wide text-gray-800 hover:bg-gray-300'
            )}
            aria-label="close"
            title={t('text-close') || 'Chiudi'}
          >
            {t('text-close') || 'Chiudi'}
            <span className="text-xs leading-none">×</span>
          </button>
        </div>
        <div className="flex items-center justify-between flex-col">
          <div className="mb-3 flex justify-between w-full">
            <Heading className="mb-0.5 text-[13px]">Subtotale:</Heading>
            <div className="min-w-[80px] text-right text-base font-semibold text-brand-dark md:text-lg">
              {cartTotal}
            </div>
          </div>
          <div className="mb-3 w-full items-center justify-center">
            <Link
              href={isEmpty === false ? `/${lang}${ROUTES.CHECKOUT}` : `/${lang}`}
              onClick={closeDrawer}
              className={cn(
                'flex w-full items-center justify-center rounded bg-gray-600 px-4 py-2.5',
                'text-sm font-semibold text-white transition hover:bg-gray-700 md:py-3',
                { 'cursor-not-allowed !text-white/40 bg-gray-400 hover:bg-gray-400': isEmpty }
              )}
            >
              VAI AL CARRELLO
            </Link>

          </div>

        </div>
      </div>

      {/* list */}
      {!isEmpty ? (
        <Scrollbar className="flex-grow w-full">
          <div className="h-[calc(100vh-210px)] w-full px-4 py-2 md:px-5">
            {items?.map((item) => (
              <CartItem item={item} key={item.id} lang={lang} />
            ))}
          </div>
        </Scrollbar>
      ) : (
        <EmptyCart lang={lang} />
      )}

      {/* footer — compact subtotal row + CTA */}
      {/* <div className="border-t border-border-base px-4 py-4 md:px-5 md:py-5">
        <div className="mb-3 flex items-center justify-between">
          <Heading className="mb-0.5 text-[13px]">Subtotale:</Heading>
          <div className="min-w-[80px] text-right text-base font-semibold text-brand-dark md:text-lg">
            {cartTotal}
          </div>
        </div>

        <Link
          href={isEmpty === false ? `/${lang}${ROUTES.CHECKOUT}` : `/${lang}`}
          onClick={closeDrawer}
          className={cn(
            'flex w-full items-center justify-center rounded bg-gray-600 px-4 py-2.5',
            'text-sm font-semibold text-white transition hover:bg-gray-700 md:py-3',
            { 'cursor-not-allowed !text-white/40 bg-gray-400 hover:bg-gray-400': isEmpty }
          )}
        >
          VAI AL CARRELLO
        </Link>
      </div> */}
    </div>
  );
}
