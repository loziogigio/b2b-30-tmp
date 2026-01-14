'use client';

import React from 'react';
import Link from 'next/link';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { formatAvailability } from '@utils/format-availability';
import { useTranslation } from 'src/app/i18n/client';

type Props = {
  product: any;
  priceData?: ErpPriceData;
  lang: string;
};

export default function B2BInfoBlock({ product, priceData, lang }: Props) {
  const { t } = useTranslation(lang, 'common');

  type SupplierArrival = {
    expected_date?: string;
    confirmed_date?: string;
    DataArrivoPrevista?: string;
    DataArrivoConfermata?: string;
    NumeroDellaSettimana?: number;
  };

  const dmyToIso = (s?: string) => {
    if (!s) return undefined;
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
  };
  const isoToDmy = (s?: string) => {
    if (!s) return undefined;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  };
  const parseDate = (s?: string) => {
    if (!s) return NaN;
    const iso = dmyToIso(s);
    const t = Date.parse(iso!);
    return Number.isNaN(t) ? NaN : t;
  };

  const arrivals: SupplierArrival[] =
    priceData?.product_label_action?.order_supplier_available ??
    (priceData as any)?.order_supplier_available ??
    (priceData as any)?.order_suplier_available ??
    [];

  const earliest = arrivals
    .map((a) => ({
      ...a,
      _chosen:
        a.expected_date ??
        a.confirmed_date ??
        a.DataArrivoPrevista ??
        a.DataArrivoConfermata,
      _ts: parseDate(
        a.expected_date ??
          a.confirmed_date ??
          a.DataArrivoPrevista ??
          a.DataArrivoConfermata,
      ),
    }))
    .filter((a) => Number.isFinite(a._ts))
    .sort((a, b) => a._ts - b._ts)[0];

  const earliestDateDmy = isoToDmy(earliest?._chosen);
  const earliestWeek = earliest?.NumeroDellaSettimana;

  const model = product?.model ?? '—';
  const codiceProdotto = product?.sku ?? product?.id ?? '—';
  const codiceFigura = (product as any)?.parent_sku ?? '—';

  const availability = Number(priceData?.availability ?? 0);
  const buyDid = Boolean(priceData?.buy_did);
  const buyDidLast = priceData?.buy_did_last_date;

  const stato =
    priceData?.product_label_action?.LABEL ??
    (availability > 0
      ? t('text-available')
      : earliestDateDmy
        ? t('text-arriving')
        : t('text-not-available'));

  const brandImg = product?.brand?.image?.original || product?.brand?.logo_url;
  const brandName = product?.brand?.name || product?.brand?.label || 'Brand';

  return (
    <div className="mt-2 rounded border border-border-base bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] items-start">
        {/* Info Grid */}
        <dl className="grid grid-cols-1 sm:grid-cols-[180px,1fr]">
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
                : earliestDateDmy
                  ? 'text-blue-700'
                  : 'text-red-600'
            }`}
          >
            {stato}
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

          {buyDid && buyDidLast && (
            <>
              <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
                {t('text-last-ordered')}
              </dt>
              <dd className="border-b border-border-base px-4 py-3 text-sm text-brand-dark">
                {buyDidLast}
              </dd>
            </>
          )}

          {earliestDateDmy && availability <= 0 && (
            <>
              <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase text-gray-600 sm:text-sm">
                {t('text-expected-arrival')}
              </dt>
              <dd className="border-b border-border-base px-4 py-3 text-sm font-semibold text-green-600">
                {earliestDateDmy ?? '—'}
                {earliestWeek ? (
                  <span className="ml-1 font-normal text-gray-700">
                    ({t('text-week')} {earliestWeek})
                  </span>
                ) : null}
              </dd>
            </>
          )}
        </dl>

        {/* Brand Logo */}
        <div className="flex items-center justify-center p-4 border-l border-border-base">
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
