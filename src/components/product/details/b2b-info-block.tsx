'use client';

import React from 'react';
import Link from 'next/link';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { formatAvailability } from '@utils/format-availability';

type Props = {
  product: any;
  priceData?: ErpPriceData;
  lang: string;
};

export default function B2BInfoBlock({ product, priceData, lang }: Props) {
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
      _chosen: a.expected_date ?? a.confirmed_date ?? a.DataArrivoPrevista ?? a.DataArrivoConfermata,
      _ts: parseDate(a.expected_date ?? a.confirmed_date ?? a.DataArrivoPrevista ?? a.DataArrivoConfermata),
    }))
    .filter((a) => Number.isFinite(a._ts))
    .sort((a, b) => a._ts - b._ts)[0];

  const earliestDateDmy = isoToDmy(earliest?._chosen);
  const earliestWeek = earliest?.NumeroDellaSettimana;

  const model = product?.model ?? '—';
  const codiceProdotto = product?.sku ?? product?.id ?? '—';
  const codiceFigura = (product as any)?.figure_code ?? (product as any)?.fig_code ?? 'F84240';

  const availability = Number(priceData?.availability ?? 0);
  const buyDid = Boolean(priceData?.buy_did);
  const buyDidLast = priceData?.buy_did_last_date;

  const stato =
    priceData?.product_label_action?.LABEL ??
    (availability > 0 ? 'DISPONIBILE' : earliestDateDmy ? 'IN ARRIVO' : 'NON DISPONIBILE');

  const brandImg = product?.brand?.image?.original || product?.brand?.logo_url;
  const brandName = product?.brand?.name || product?.brand?.label || 'Brand';

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-white/60">
      <div className="grid grid-cols-5 items-start gap-4 p-4">
        <div className="col-span-4">
          <dl className="grid grid-cols-[140px,1fr] gap-y-2 text-[13px] sm:text-sm">
            <dt className="text-gray-500">MODELLO:</dt>
            <dd className="font-semibold text-gray-700 break-words">{model}</dd>

            <dt className="text-gray-500">Codice Prodotto:</dt>
            <dd className="text-gray-700">{codiceProdotto}</dd>

            <dt className="text-gray-500">Codice Figura:</dt>
            <dd className="text-gray-700">{codiceFigura}</dd>

            <dt className="text-gray-500">Stato:</dt>
            <dd
              className={
                availability > 0
                  ? 'font-semibold text-emerald-600'
                  : earliestDateDmy
                    ? 'font-semibold text-blue-700'
                    : 'font-semibold text-red-600'
              }
            >
              {stato}
            </dd>

            { availability > 0 && priceData && (
              <>
                <dt className="text-gray-500">Disponiblita:</dt>
                <dd className="text-gray-700">{formatAvailability(
                  availability,
                  priceData.packaging_option_default?.packaging_uom
                )}</dd>
              </>
            )}

            {buyDid && buyDidLast && (
              <>
                <dt className="text-gray-500">Ultimo ordinato:</dt>
                <dd className="text-gray-700">{buyDidLast}</dd>
              </>
            )}
            {earliestDateDmy && availability <= 0 && (
              <>
                <dt className="text-gray-500">Arrivo Previsto:</dt>
                <dd className="font-semibold text-green-600">
                  {earliestDateDmy ?? '—'}
                  {earliestWeek ? <span className="ml-1 text-gray-700">(Settimana {earliestWeek})</span> : null}
                </dd>
              </>
            )}
          </dl>
        </div>

        <div className="col-span-1 flex justify-end">
          {brandImg ? (
            <Link
              href={`/${lang}/search?filters-id_brand=${product?.brand?.id || product?.brand?.brand_id || ''}`}
              className="flex justify-start sm:justify-end"
            >
              <img src={brandImg} alt={brandName} className="h-16 w-auto max-w-[120px] object-contain" />
            </Link>
          ) : (
            <div className="h-10 sm:h-12 w-24 rounded bg-gray-100" />
          )}
        </div>
      </div>
    </div>
  );
}

