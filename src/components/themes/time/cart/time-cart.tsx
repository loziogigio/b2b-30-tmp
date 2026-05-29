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
import { useModalAction } from '@components/common/modal/modal.context';
import usePrice from '@framework/product/use-price';
import UpdateCart from '@components/product/update-cart';
import { ROUTES } from '@utils/routes';
import { useTranslation } from 'src/app/i18n/client';
import { HiOutlineTrash } from 'react-icons/hi';
import { getCartItemRenderKey } from '@components/cart/cart-item-key';

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
  const { openModal } = useModalAction();
  const { price: cartTotal } = usePrice({ amount: total, currencyCode: 'EUR' });

  const openPreview = (item: any) => {
    // The popup detects thin product data and re-fetches by sku, so we
    // just need to hand it the cart item. We still pre-shape `image` as
    // an object so the placeholder/skeleton during the fetch isn't blank.
    const imgUrl = prefixImageUrl(item?.image, 'gallery_') ?? item?.image ?? '';
    const product = {
      ...item,
      image: imgUrl ? { thumbnail: imgUrl, original: imgUrl } : item?.image,
    };
    closeDrawer();
    openModal('PRODUCT_VIEW', product);
  };

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
                  key={getCartItemRenderKey(item, i)}
                  className="group relative flex items-start gap-3 py-3 border-b border-[var(--time-gray-50)] last:border-b-0"
                >
                  {/* Image — click to open preview */}
                  <button
                    type="button"
                    onClick={() => openPreview(item)}
                    aria-label={t('text-view-product', {
                      defaultValue: 'Visualizza prodotto',
                    })}
                    className="relative w-[52px] h-[52px] shrink-0 rounded-[var(--radius-btn)] overflow-hidden bg-gradient-to-br from-[var(--time-gray-50)] to-[var(--time-gray-100)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--time-red)]/40"
                  >
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
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {item?.sku && (
                      <span className="inline-block text-[10px] font-semibold text-[var(--time-red)] bg-[rgba(230,57,70,0.08)] px-1.5 py-0.5 rounded-[4px] font-[var(--font-mono)] mb-0.5">
                        {item.sku}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => openPreview(item)}
                      className="text-left text-[13px] font-semibold text-[var(--time-dark)] truncate leading-tight w-full hover:text-[var(--time-red)] transition-colors"
                      title={item?.name}
                    >
                      {item?.name}
                    </button>
                    {!hidePrices && (
                      <div className="text-[11px] text-[var(--time-gray-400)] mt-0.5 font-[var(--font-mono)]">
                        {qty} × {money(unit)}
                      </div>
                    )}
                    <UpdateCart
                      item={item}
                      lang={lang}
                      className="mt-1 time-stepper"
                    />
                  </div>

                  {/* Right column: line total + explicit delete */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5 pt-1">
                    {!hidePrices && (
                      <div className="text-right text-sm font-bold text-[var(--time-dark)] tabular-nums">
                        {money(unit * qty)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => clearItemFromCart(item)}
                      aria-label={t('text-remove', {
                        defaultValue: 'Rimuovi',
                      })}
                      title={t('text-remove', { defaultValue: 'Rimuovi' })}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-btn)] text-[var(--time-gray-400)] hover:text-[var(--time-red)] hover:bg-[rgba(230,57,70,0.08)] transition-colors"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
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
