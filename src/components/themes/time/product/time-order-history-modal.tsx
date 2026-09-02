'use client';

import React from 'react';
import { useModalState } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import Image from '@components/ui/image';
import { ERP_STATIC } from '@framework/utils/static';
import { useLatestOrderByItem } from '@framework/erp/latest-order';
import type { LatestOrderRow } from '@utils/transform/erp-latest-order';
import TimeDrawerShell from './time-drawer-shell';

/** Rows shown before the "mostra altri" button, and per click after it. */
const PAGE_SIZE = 10;

/**
 * The table is seven narrow columns; letting it span a fullscreen drawer would
 * strand the figures at opposite edges. Cap the content column instead.
 */
const CONTENT_WIDTH = 860;

/**
 * "Già ordinato" popup: this customer's order history for one article, read
 * from MyMB `GetUltimoOrdinatoClienteXArticolo`.
 *
 * Opened by the green GIÀ ORDINATO badge, which renders on the product card,
 * the search row, the variants table, the detail page and the product popup.
 * Uses the theme's shared drawer shell, so opening it from inside the variants
 * drawer stacks on top of it and "torna indietro" returns to the variants list.
 */
export default function TimeOrderHistoryModal({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data } = useModalState();
  const [visible, setVisible] = React.useState(PAGE_SIZE);

  const product = (data as any)?.product ?? {};
  const priceData = (data as any)?.priceData;
  const entityCode = String(
    priceData?.entity_code ?? product?.entity_code ?? product?.id ?? '',
  );
  const customerCode = String(ERP_STATIC.customer_code ?? '');

  const {
    data: history,
    isLoading,
    isError,
  } = useLatestOrderByItem({
    customerCode,
    entityCode,
  });

  const rows: LatestOrderRow[] = history?.rows ?? [];
  const shown = rows.slice(0, visible);
  const remaining = rows.length - shown.length;

  // Only the ERP-side unit is missing (MyMB always sends UM: null here), so
  // the packaging UOM comes from the price data, as the inline badge does.
  const uom = priceData?.packaging_option_default?.packaging_uom ?? '';
  const image = product?.image?.thumbnail || product?.image?.original;
  const name =
    typeof product?.name === 'string'
      ? product.name
      : (product?.name?.[lang] ?? product?.name?.it ?? '');

  const columns = [
    t('text-date', { defaultValue: 'Data' }),
    t('text-cause', { defaultValue: 'Causale' }),
    t('text-document', { defaultValue: 'Documento' }),
    t('text-ordered-qty', { defaultValue: 'Ordinato' }),
    t('text-settled-qty', { defaultValue: 'Saldato' }),
    t('text-delivered-qty', { defaultValue: 'Consegnato' }),
    t('text-residual-qty', { defaultValue: 'Residuo' }),
  ];

  return (
    <TimeDrawerShell
      lang={lang}
      title={t('text-order-history', { defaultValue: 'Storico ordinato' })}
      maxContentWidth={CONTENT_WIDTH}
    >
      {/* Article identity */}
      <div className="flex items-center gap-4 pb-4 border-b border-[var(--time-gray-200,#e5e7eb)]">
        {image && (
          <div className="w-16 h-16 shrink-0 relative">
            <Image
              src={image}
              alt={name || product?.sku || ''}
              width={64}
              height={64}
              className="object-contain w-full h-full"
            />
          </div>
        )}
        <div className="min-w-0">
          {product?.sku && (
            <span className="inline-block bg-[var(--time-red)] text-white text-[11px] font-extrabold px-2 py-[2px] rounded uppercase tracking-wide">
              {product.sku}
            </span>
          )}
          <p className="mt-1 text-sm sm:text-base font-bold text-[var(--time-dark)] truncate">
            {name}
          </p>
        </div>
      </div>

      <div className="pt-5">
        {isLoading && (
          <p
            role="status"
            className="py-8 text-sm text-[var(--time-gray-500,#6b7280)]"
          >
            {t('text-loading', { defaultValue: 'Caricamento…' })}
          </p>
        )}

        {!isLoading && isError && (
          <p className="py-8 text-sm text-[#dc2626]">
            {t('text-order-history-unavailable', {
              defaultValue: 'Storico non disponibile al momento.',
            })}
          </p>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          // MyMB answers ReturnCode 0 + [] both for "never ordered" and for
          // any bad code, so this is the only honest wording available.
          <p className="py-8 text-sm text-[var(--time-gray-500,#6b7280)]">
            {t('text-no-orders-for-article', {
              defaultValue: 'Nessun ordine registrato per questo articolo.',
            })}
          </p>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            {history?.fromDate && (
              <p className="text-[13px] font-extrabold uppercase tracking-wide text-[var(--time-dark)] mb-3">
                {t('text-ordered-since', { defaultValue: 'Ordinato dal' })}{' '}
                <span className="font-mono tabular-nums">
                  {history.fromDate}
                </span>
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-brand text-white">
                    {columns.map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-3 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row, i) => (
                    <tr
                      key={`${row.document}-${row.lineNumber}-${i}`}
                      className="border-b border-[var(--time-gray-200,#e5e7eb)]"
                    >
                      <td className="px-3 py-2 font-mono tabular-nums whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">
                        {row.causale}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums whitespace-nowrap">
                        {row.document}
                      </td>
                      {/* Four independent ERP figures — never derived from
                          one another (a live row reads 2148/0/240/0). */}
                      <td className="px-3 py-2 tabular-nums">{row.ordered}</td>
                      <td className="px-3 py-2 tabular-nums">{row.settled}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.delivered}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{row.residual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {uom && (
              <p className="mt-2 text-[11px] text-[var(--time-gray-500,#6b7280)]">
                {t('text-quantities-in-uom', {
                  uom,
                  defaultValue: `Quantità espresse in ${uom}`,
                })}
              </p>
            )}

            {remaining > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--time-dark)] px-5 py-2 text-sm font-bold text-[var(--time-dark)] hover:bg-[var(--time-dark)] hover:text-white transition-colors cursor-pointer"
                >
                  {t('text-show-more', { defaultValue: 'Mostra altri' })} (
                  {remaining})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </TimeDrawerShell>
  );
}
