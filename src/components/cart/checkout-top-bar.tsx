'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useCart } from '@contexts/cart/cart.context';
import { useTranslation } from 'src/app/i18n/client';

function formatEUR(n: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

export default function CheckoutTopBar({
  lang,
  detailsId = 'checkout-details',
  continueHref, // optional: override destination
  totalLabel,
  totalOverride, // optional: server snapshot if you have it
}: {
  lang: string;
  detailsId?: string;
  continueHref?: string;
  totalLabel?: string;
  totalOverride?: number;
}) {
  const { t } = useTranslation(lang, 'common');
  // read local cart total on the client
  const { total } = useCart();
  const totalDisplay = useMemo(
    () => formatEUR(totalOverride ?? total ?? 0),
    [totalOverride, total],
  );

  const onNext = () => {
    const el = document.getElementById(detailsId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Continue shopping */}
      <div className="flex items-center">
        <Link
          href={continueHref ?? `/${lang}`}
          className="inline-flex h-10 items-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← {t('text-continue-shopping')}
        </Link>
      </div>

      {/* Right: Total + Next steps */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs text-gray-500">
            {totalLabel || t('text-total-net')}
          </div>
          <div className="text-base font-semibold">{totalDisplay}</div>
        </div>
        <button
          onClick={onNext}
          className="h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 active:translate-y-px"
        >
          {t('text-next-steps')}
        </button>
      </div>
    </div>
  );
}
