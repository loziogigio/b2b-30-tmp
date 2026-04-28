'use client';

import React from 'react';
import cn from 'classnames';
import dynamic from 'next/dynamic';
import { prefixImageUrl } from '@utils/image-versioning';
import Link from 'next/link';
import Image from '@components/ui/image';
import Scrollbar from '@components/ui/scrollbar';
import { useCart } from '@contexts/cart/cart.context';
import { useUI } from '@contexts/ui.context';
import usePrice from '@framework/product/use-price';
import UpdateCart from '@components/product/update-cart';
import { ROUTES } from '@utils/routes';
import { useTranslation } from 'src/app/i18n/client';

const Delivery = dynamic(() => import('@layouts/header/delivery'), {
  ssr: false,
});

const money = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    n,
  );

const getUnitNet = (it: any) =>
  Number(
    it?.priceDiscount ??
      it?.price_discount ??
      it?.__cartMeta?.price_discount ??
      it?.price ??
      0,
  );

export default function TimeCart({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { closeDrawer, hidePrices } = useUI();
  const { items, total, isEmpty, clearItemFromCart } = useCart();
  const { price: cartTotal } = usePrice({ amount: total, currencyCode: 'EUR' });

  return (
    <div className="flex h-full w-full flex-col font-[var(--font-body)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[var(--time-gray-100)] px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[15px] font-extrabold text-[var(--time-dark)] font-[var(--font-display)]">
            {t('text-cart', { defaultValue: 'Carrello' })}
          </h3>
          <button
            onClick={closeDrawer}
            className="w-8 h-8 rounded-[var(--radius-btn)] bg-[var(--time-gray-50)] flex items-center justify-center text-[var(--time-gray-400)] hover:bg-[var(--time-gray-100)] hover:text-[var(--time-dark)] transition-colors"
            aria-label="close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="3" x2="11" y2="11" />
              <line x1="11" y1="3" x2="3" y2="11" />
            </svg>
          </button>
        </div>

        {/* Delivery */}
        <div className="py-1.5 border-b border-[var(--time-gray-100)] mb-2">
          <Delivery lang={lang} className="text-sm" />
        </div>

        {/* Subtotal + CTA */}
        {!hidePrices && !isEmpty && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--time-gray-400)] uppercase tracking-[0.06em]">
              Subtotale
            </span>
            <span className="text-lg font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums">
              {cartTotal}
            </span>
          </div>
        )}

        <Link
          href={`/${lang}${ROUTES.CHECKOUT}`}
          onClick={closeDrawer}
          className="flex w-full items-center justify-center h-11 rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-white text-[13px] font-bold transition-colors hover:bg-[var(--time-red)]"
        >
          VAI AL CARRELLO
        </Link>
      </div>

      {/* Items */}
      {!isEmpty ? (
        <Scrollbar className="flex-grow w-full">
          <div className="w-full px-4 py-2">
            {items?.map((item: any, i: number) => {
              const qty = Number(item?.quantity ?? 0);
              const unit = getUnitNet(item);

              return (
                <div
                  key={`${item.id}-${item.rowId ?? i}`}
                  className="group relative flex items-start gap-3 py-3 border-b border-[var(--time-gray-50)] last:border-b-0"
                >
                  {/* Image */}
                  <div className="relative w-[52px] h-[52px] shrink-0 rounded-[var(--radius-btn)] overflow-hidden bg-gradient-to-br from-[var(--time-gray-50)] to-[var(--time-gray-100)]">
                    <Image
                      src={
                        prefixImageUrl(item?.image, 'gallery_') ??
                        item?.image ??
                        '/assets/placeholders/no-image.jpeg'
                      }
                      width={52}
                      height={52}
                      loading="eager"
                      alt={item?.name || 'Product'}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => clearItemFromCart(item)}
                      className="absolute inset-0 hidden items-center justify-center bg-black/30 text-white transition md:flex md:opacity-0 md:group-hover:opacity-100"
                      aria-label="remove"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {item?.sku && (
                      <span className="inline-block text-[10px] font-semibold text-[var(--time-red)] bg-[rgba(230,57,70,0.08)] px-1.5 py-0.5 rounded-[4px] font-[var(--font-mono)] mb-0.5">
                        {item.sku}
                      </span>
                    )}
                    <div className="text-[13px] font-semibold text-[var(--time-dark)] truncate leading-tight">
                      {item?.name}
                    </div>
                    {!hidePrices && (
                      <div className="text-[11px] text-[var(--time-gray-400)] mt-0.5 font-[var(--font-mono)]">
                        {qty} × {money(unit)}
                      </div>
                    )}
                    <UpdateCart
                      item={item}
                      lang={lang}
                      className="mt-1 justify-start"
                    />
                  </div>

                  {/* Line total */}
                  {!hidePrices && (
                    <div className="shrink-0 text-right text-sm font-bold text-[var(--time-dark)] tabular-nums pt-1">
                      {money(unit * qty)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Scrollbar>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
          <div className="text-[40px] mb-3">🛒</div>
          <div className="text-[15px] font-semibold text-[var(--time-gray-600)]">
            {t('text-empty-cart', { defaultValue: 'Il carrello è vuoto' })}
          </div>
          <div className="text-[12px] text-[var(--time-gray-400)] mt-1">
            {t('text-empty-cart-description', {
              defaultValue: 'Aggiungi prodotti dal catalogo',
            })}
          </div>
        </div>
      )}
    </div>
  );
}
