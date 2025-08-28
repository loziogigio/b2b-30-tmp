'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import cn from 'classnames';
import CartTableB2B from '@components/cart/cart-table-b2b';
import CheckoutSendOrder from '@components/checkout/checkout-send-order';
import { useCart } from '@contexts/cart/cart.context';
import CartTotals from './cart-totals';

function formatEUR(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

type Stage = 'cart' | 'details';

export default function CheckoutFlow({
  lang,
  detailsId = 'checkout-details',
  continueHref,
  totalOverride,
}: {
  lang: string;
  detailsId?: string;
  continueHref?: string;
  totalOverride?: number;
}) {
  // ⬇️ also pull setItemQuantity so we can handle +/- from the table
  const { total, totalItems, items, setItemQuantity } = useCart();

  const itemCount = totalItems || items?.length || 0;
  const totalDisplay = useMemo(
    () => formatEUR(totalOverride ?? total ?? 0),
    [totalOverride, total]
  );

  const [stage, setStage] = useState<Stage>('cart');

  const cartRef = useRef<HTMLDivElement>(null);
  const [cartMaxH, setCartMaxH] = useState(0);

  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsMaxH, setDetailsMaxH] = useState(0);

  const recalc = () => {
    if (cartRef.current) {
      const el = cartRef.current;
      el.style.maxHeight = 'none';
      const h = el.scrollHeight;
      setCartMaxH(h);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = el.offsetHeight;
      el.style.maxHeight = stage === 'cart' ? `${h}px` : '0px';
    }
    if (detailsRef.current) {
      const el = detailsRef.current;
      el.style.maxHeight = 'none';
      const h = el.scrollHeight;
      setDetailsMaxH(h);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = el.offsetHeight;
      el.style.maxHeight = stage === 'details' ? `${h}px` : '0px';
    }
  };

  useLayoutEffect(() => {
    recalc();
    const onResize = () => recalc();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cartRef.current) cartRef.current.style.maxHeight = stage === 'cart' ? `${cartMaxH}px` : '0px';
    if (detailsRef.current) detailsRef.current.style.maxHeight = stage === 'details' ? `${detailsMaxH}px` : '0px';
  }, [stage, cartMaxH, detailsMaxH]);

  // Recompute height when rows count changes
  useEffect(() => {
    recalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items?.length]);

  const goToDetails = () => {
    setStage('details');
    setTimeout(() => {
      const target = document.getElementById(detailsId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const backToCart = () => {
    setStage('cart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { meta } = useCart();


  return (
    <div className="mx-auto flex flex-col">
      {/* Top bar */}
      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={continueHref ?? `/${lang}`}
            className="inline-flex h-10 items-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Continue shopping
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500">Totale Netto</div>
            <div className="text-base font-semibold" suppressHydrationWarning>
              {totalDisplay}
            </div>
          </div>
          {stage === 'cart' ? (
            <button
              onClick={goToDetails}
              className={cn(
                'h-10 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white',
                'hover:bg-violet-700 active:translate-y-px transition'
              )}
              aria-expanded={false}
              aria-controls="details-accordion"
            >
              Next Steps
            </button>
          ) : (
            <button
              onClick={backToCart}
              className="h-10 rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              aria-expanded={true}
              aria-controls="cart-accordion"
            >
              Edit cart
            </button>
          )}
        </div>
      </div>

      {/* CART (collapsible) */}
      <div
        id="cart-accordion"
        ref={cartRef}
        className={cn(
          'overflow-hidden rounded-md border border-gray-200 bg-white',
          'transition-[max-height] duration-500 ease-in-out'
        )}
        style={{ maxHeight: stage === 'cart' ? `${cartMaxH}px` : 0 }}
        aria-hidden={stage !== 'cart'}
      >
        <div className="p-2">
          {/* ⬇️ pass items + qty handler */}
          <CartTableB2B />
        </div>
      </div>

      {/* CART compact header when closed */}
      {stage !== 'cart' && (
        <div className="mt-4 rounded-md border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div>
              {meta && (<CartTotals
                totals={{
                  gross: meta.totalGross,
                  net: meta.totalNet,
                  vat: meta.vat,
                  doc: meta.totalDoc,
                  vatRate: meta.totalNet > 0 ? Math.round((meta.vat / meta.totalNet) * 100) : undefined,
                }}
              />
              )}
            </div>
            <button
              onClick={backToCart}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Edit cart
            </button>
          </div>
        </div>
      )}

      {/* DETAILS (collapsible) */}
      <div className="mt-6">
        {/* Closed header with CTA */}
        {stage !== 'details' && (
          <div className="mb-3 flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex min-h-[36px] items-center rounded-full border-2 border-indigo-600 px-3 text-sm font-semibold text-indigo-600">
                Complete all fields and send the order
              </span>
              <span className="text-sm font-medium text-gray-900">text-delivery-confirm-send-order</span>
            </div>
            <button
              onClick={goToDetails}
              className="h-9 rounded-md bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-700"
              aria-controls="details-accordion"
              aria-expanded={true}
            >
              Click here to move to next step
            </button>
          </div>
        )}

        <div
          id="details-accordion"
          ref={detailsRef}
          className={cn(
            'overflow-hidden rounded-md border border-gray-200 bg-white',
            'transition-[max-height] duration-500 ease-in-out'
          )}
          style={{ maxHeight: stage === 'details' ? `${detailsMaxH}px` : 0 }}
          aria-hidden={stage !== 'details'}
        >
          <div className="p-4 sm:p-6">
            <CheckoutSendOrder lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}
