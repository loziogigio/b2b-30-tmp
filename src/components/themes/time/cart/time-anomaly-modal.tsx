'use client';

import type {
  AnomalyResult,
  ErpAnomaly,
  ErpItem,
} from '@/hooks/use-order-submit';
import { formatAnomalyFlags } from '@/hooks/use-order-submit';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';

interface TimeAnomalyModalProps {
  lang: string;
  result: AnomalyResult;
  isSubmitting: boolean;
  onAutofix: () => void;
  onEdit: () => void;
  onClose: () => void;
}

function resolveCode(anomaly: ErpAnomaly, erpItems: ErpItem[]): string {
  const item = erpItems.find((i) => i.erp_line_number === anomaly.IdRiga);
  return item?.erp_data?.oarti || `Riga ${anomaly.IdRiga}`;
}

export default function TimeAnomalyModal({
  lang,
  result,
  isSubmitting,
  onAutofix,
  onEdit,
  onClose,
}: TimeAnomalyModalProps) {
  const { t } = useTranslation(lang, 'common');
  const { anomalies, erpItems, itemErrors = [] } = result;
  const count = anomalies.length;

  // Two distinct 422 causes share this modal:
  //   • price/promo anomalies → autofixable (update listino / drop invalid promos)
  //   • ERP export failures (erp_item_errors) → NOT autofixable; a transient
  //     technical failure. Show a generic "retry, contact us if it persists"
  //     message with a single retry action — never the price/promo copy.
  const isExportFailure = count === 0 && itemErrors.length > 0;

  const shell = (children: React.ReactNode) => (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[20px] max-w-[560px] w-full shadow-2xl overflow-hidden time-animate-fadeUp"
      >
        {children}
      </div>
    </div>
  );

  const warningIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  // ── ERP export failure (technical, not a price/promo anomaly) ──
  if (isExportFailure) {
    return shell(
      <>
        <div className="px-6 py-5 border-b border-[var(--time-gray-100)] bg-amber-50/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              {warningIcon}
            </div>
            <div>
              <h3 className="text-[18px] font-black text-[var(--time-dark)] font-[var(--font-display)]">
                {t('order-export-fail-title', {
                  defaultValue: 'Invio ordine non riuscito',
                })}
              </h3>
              <p className="text-[13px] text-[var(--time-gray-500)]">
                {t('order-export-fail-count', {
                  count: itemErrors.length,
                  defaultValue: '{{count}} articoli non inviati',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pt-4 text-[13px] text-[var(--time-gray-600)] leading-relaxed font-[var(--font-body)]">
          {t('order-export-fail-explain', {
            defaultValue:
              'Non è stato possibile inviare alcuni articoli. Riprova; se il problema persiste, contatta il nostro team di assistenza.',
          })}
        </div>

        <div className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {itemErrors.map((e, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 rounded-md bg-[var(--time-red)]/8 text-[var(--time-red)] text-[11px] font-bold font-[var(--font-mono)]"
              >
                {e.oarti || `Riga ${e.line_number ?? i + 1}`}
              </span>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[var(--time-gray-100)]">
          <button
            onClick={onEdit}
            className="w-full min-h-[52px] px-4 rounded-xl border-none text-[14px] font-bold text-white font-[var(--font-body)] uppercase tracking-wide bg-[var(--time-red)] hover:bg-[var(--time-dark)] cursor-pointer transition-all shadow-[0_4px_16px_rgba(230,57,70,0.25)]"
          >
            {t('order-export-fail-back', { defaultValue: 'Torna al carrello' })}
          </button>
        </div>
      </>,
    );
  }

  // ── Price/promo anomalies (autofixable) ──
  return shell(
    <>
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--time-gray-100)] bg-amber-50/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            {warningIcon}
          </div>
          <div>
            <h3 className="text-[18px] font-black text-[var(--time-dark)] font-[var(--font-display)]">
              {t('anomaly-title', { defaultValue: 'Anomalie riscontrate' })}
            </h3>
            <p className="text-[13px] text-[var(--time-gray-500)]">
              {t('anomaly-count', {
                count,
                defaultValue: '{{count}} anomalie riscontrate',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="px-6 pt-4 text-[13px] text-[var(--time-gray-600)] leading-relaxed font-[var(--font-body)]">
        {t('anomaly-explain-pre', {
          defaultValue:
            'Gentile cliente, nel carrello sono presenti articoli con listino variato o promozioni non valide, cliccando su',
        })}{' '}
        <strong className="text-[var(--time-dark)]">
          &quot;
          {t('anomaly-explain-strong', {
            defaultValue:
              'AGGIORNA CARRELLO CON LISTINO VARIATO O PROMOZIONI NON VALIDE',
          })}
          &quot;
        </strong>{' '}
        {t('anomaly-explain-post', {
          defaultValue: 'verranno mostrati i valori aggiornati.',
        })}
      </div>

      {/* Anomalies table */}
      {count > 0 && (
        <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
          <table className="w-full text-[13px] font-[var(--font-body)]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-[var(--time-gray-500)] border-b border-[var(--time-gray-100)]">
                <th className="pb-2 pr-3 font-bold">
                  {t('orders-item', { defaultValue: 'Articolo' })}
                </th>
                <th className="pb-2 font-bold">
                  {t('anomaly-col-problem', { defaultValue: 'Problema' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--time-gray-50)]">
              {anomalies.map((a, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--time-red)]/8 text-[var(--time-red)] text-[11px] font-bold font-[var(--font-mono)]">
                      {resolveCode(a, erpItems)}
                    </span>
                  </td>
                  <td className="py-2.5 text-[var(--time-gray-600)]">
                    {formatAnomalyFlags(a)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.errorMessage && (
        <div className="px-6 pb-3 text-[13px] text-[var(--time-red)]">
          {result.errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-5 border-t border-[var(--time-gray-100)] grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onEdit}
          disabled={isSubmitting}
          className="min-h-[80px] px-4 py-3 rounded-xl border-[1.5px] border-[var(--time-gray-200)] bg-white text-[13px] font-bold text-[var(--time-gray-600)] font-[var(--font-body)] hover:bg-[var(--time-gray-50)] transition-colors disabled:opacity-50 uppercase leading-snug text-center"
        >
          {t('anomaly-edit', {
            defaultValue: 'Torna al carrello e aggiorna manualmente',
          })}
        </button>
        <button
          onClick={onAutofix}
          disabled={isSubmitting}
          className={cn(
            'min-h-[80px] px-4 py-3 rounded-xl border-none text-[13px] font-bold text-white font-[var(--font-body)] transition-all shadow-[0_4px_16px_rgba(230,57,70,0.25)] uppercase leading-snug text-center',
            isSubmitting
              ? 'bg-[var(--time-gray-400)] cursor-not-allowed'
              : 'bg-[var(--time-red)] hover:bg-[var(--time-dark)] cursor-pointer',
          )}
        >
          {isSubmitting
            ? t('anomaly-updating', {
                defaultValue: 'Aggiornamento in corso...',
              })
            : t('anomaly-autofix', {
                defaultValue:
                  'Aggiorna carrello con listino variato o promozioni non valide',
              })}
        </button>
      </div>
    </>,
  );
}
