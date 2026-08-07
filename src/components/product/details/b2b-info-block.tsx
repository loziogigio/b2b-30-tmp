'use client';

import React from 'react';
import Link from 'next/link';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { formatAvailability } from '@utils/format-availability';
import { useArrivalLabel } from '../arrival-notice';
import { useTranslation } from 'src/app/i18n/client';
import LastOrdered from '../last-ordered';

type Props = {
  product: any;
  priceData?: ErpPriceData;
  lang: string;
};

export default function B2BInfoBlock({ product, priceData, lang }: Props) {
  const { t } = useTranslation(lang, 'common');

  const model = product?.model ?? '—';
  const codiceProdotto = product?.sku ?? product?.id ?? '—';
  const codiceFigura = (product as any)?.parent_sku ?? '—';

  const availability = Number(priceData?.availability ?? 0);
  // ERP order lines first, PIM `arrivals` as the fallback for inline-pricing
  // tenants; phrased per the channel's arrival_display setting.
  const arrivalLabel = useArrivalLabel(
    lang,
    product?.arrivals,
    availability,
    priceData,
  );
  const buyDid = Boolean(priceData?.buy_did);
  const buyDidLast = priceData?.buy_did_last_date;
  const buyDidAmount = priceData?.buy_did_amount;
  const isPromo = Boolean(
    priceData?.is_promo || priceData?.promo || product?.has_active_promo,
  );
  const promoCount = Number(priceData?.count_promo ?? 0);

  const stato =
    priceData?.product_label_action?.LABEL ??
    (availability > 0
      ? t('text-available')
      : arrivalLabel
        ? t('text-arriving')
        : t('text-not-available'));

  const brandImg = product?.brand?.image?.original || product?.brand?.logo_url;
  const brandName = product?.brand?.name || product?.brand?.label || 'Brand';

  const isNew = Boolean((product as any)?.is_new);

  return (
    <div className="mt-2 bg-white">
      {(isNew || isPromo) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {isNew && (
            <span className="inline-block rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {t('badge-new', { defaultValue: 'New' })}
            </span>
          )}
          {isPromo && (
            <span className="inline-block rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
              PROMO
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] items-start">
        {/* Info Grid - borders only on the text content */}
        <dl className="grid grid-cols-1 sm:grid-cols-[180px,1fr] border border-border-base rounded-l lg:rounded-r-none rounded-r">
          <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
            {t('text-model')}
          </dt>
          <dd className="border-b border-border-base px-4 py-3 text-sm font-semibold text-brand-dark break-words">
            {model}
          </dd>

          <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
            {t('text-product-code')}
          </dt>
          <dd className="border-b border-border-base px-4 py-3 text-sm text-brand-dark">
            {codiceProdotto}
          </dd>

          <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
            {t('text-figure-code')}
          </dt>
          <dd className="border-b border-border-base px-4 py-3 text-sm text-brand-dark">
            {codiceFigura}
          </dd>

          <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
            {t('text-state')}
          </dt>
          <dd
            className={`border-b border-border-base px-4 py-3 text-sm font-semibold ${
              availability > 0
                ? 'text-emerald-600'
                : arrivalLabel
                  ? 'text-blue-700'
                  : 'text-red-600'
            }`}
          >
            <span className="inline-flex items-center gap-2 flex-wrap">
              <span>{stato}</span>
              {isPromo && (
                <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-[2px] rounded uppercase tracking-wide">
                  {promoCount > 1
                    ? t('text-see-offers', { defaultValue: 'Vedi offerte' })
                    : t('text-in-promo', { defaultValue: 'In offerta' })}
                </span>
              )}
              {buyDid && (
                <span
                  className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-[2px] rounded uppercase tracking-wide"
                  title={buyDidLast || undefined}
                >
                  {t('text-already-ordered', {
                    defaultValue: 'Già ordinato',
                  })}
                </span>
              )}
            </span>
          </dd>

          {availability > 0 && priceData && (
            <>
              <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
                {t('text-availability-label')}
              </dt>
              <dd className="border-b border-border-base px-4 py-3 text-sm text-brand-dark">
                {formatAvailability(
                  availability,
                  priceData.packaging_option_default?.packaging_uom,
                )}
              </dd>
            </>
          )}

          {buyDid && (buyDidLast || buyDidAmount) && (
            <>
              <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
                {t('text-last-ordered')}
              </dt>
              <dd className="border-b border-border-base px-4 py-3 text-sm text-brand-dark">
                <LastOrdered
                  lang={lang}
                  priceData={priceData}
                  variant="detail"
                />
              </dd>
            </>
          )}

          {arrivalLabel && availability <= 0 && (
            <>
              <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
                {t('text-expected-arrival')}
              </dt>
              <dd className="border-b border-border-base px-4 py-3 text-sm font-semibold text-green-600">
                {arrivalLabel}
              </dd>
            </>
          )}
        </dl>

        {/* Brand Logo - no border */}
        <div className="flex items-center justify-center p-4">
          {brandImg ? (
            <Link
              href={`/${lang}/search?filters-brand_id=${product?.brand?.id || product?.brand?.brand_id || ''}`}
              className="flex justify-center"
            >
              <img
                src={brandImg}
                alt={brandName}
                className="h-16 w-auto max-w-[120px] object-contain"
              />
            </Link>
          ) : (
            <div className="h-12 w-24 rounded bg-gray-100" />
          )}
        </div>
      </div>
    </div>
  );
}
