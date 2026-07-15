'use client';

import { useTranslation } from 'src/app/i18n/client';
import type { OrderSubmitFlowApi } from '@/hooks/use-order-submit-flow';
import type { Stage } from '@/hooks/order-submit-flow.machine';

interface Recap {
  deliveryType: string;
  deliveryDate: string;
  items: number;
  netTotal: string;
  total: string;
}

interface Props {
  lang: string;
  flow: OrderSubmitFlowApi;
  recap: Recap;
}

const OVERLAY =
  'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
const CARD =
  'bg-white rounded-[20px] shadow-2xl overflow-hidden w-full max-w-[460px] font-[family-name:var(--font-body)] time-animate-fadeUp';
const PRIMARY_BTN =
  'flex-1 min-h-[52px] px-4 rounded-xl border-none text-[14px] font-bold text-white uppercase tracking-wide bg-[var(--time-red)] hover:bg-[var(--time-dark)] transition-colors disabled:bg-[var(--time-gray-400)] disabled:cursor-not-allowed cursor-pointer';
const SECONDARY_BTN =
  'flex-1 min-h-[52px] px-4 rounded-xl border-[1.5px] border-[var(--time-gray-200)] bg-white text-[14px] font-bold text-[var(--time-gray-600)] hover:bg-[var(--time-gray-50)] transition-colors disabled:opacity-50 cursor-pointer';

function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-[3px] border-[var(--time-gray-50)] border-t-[var(--time-red)]"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export default function TimeOrderSubmitModal({ lang, flow, recap }: Props) {
  const { t } = useTranslation(lang, 'common');
  const { status } = flow;

  if (status === 'idle' || status === 'anomalies') return null;

  const stages: { n: Stage; label: string }[] = [
    { n: 1, label: t('submit-stage-start', { defaultValue: 'Inizio' }) },
    {
      n: 2,
      label: t('submit-stage-validate', {
        defaultValue: 'Validazione sistema gestionale',
      }),
    },
    {
      n: 3,
      label: t('submit-stage-finalize', {
        defaultValue: 'Finalizzazione ordine',
      }),
    },
  ];

  const progressCopy = flow.reconnecting
    ? t('submit-reconnecting', { defaultValue: 'Riconnessione…' })
    : flow.copyTier === 'almost'
      ? t('submit-almost', {
          defaultValue: 'Ci siamo quasi — non chiudere la pagina.',
        })
      : flow.copyTier === 'slow'
        ? t('submit-slow', {
            defaultValue:
              'Sta richiedendo più tempo del solito (1-3 minuti). Non chiudere la pagina.',
          })
        : t('submit-inprogress', {
            defaultValue: "Invio dell'ordine in corso…",
          });

  return (
    <div
      className={OVERLAY}
      onClick={status === 'confirm' ? flow.cancel : undefined}
    >
      <div className={CARD} onClick={(e) => e.stopPropagation()}>
        {/* ── Confirm recap ─────────────────────────────────────────────── */}
        {status === 'confirm' && (
          <div className="p-7">
            <h3 className="text-[19px] font-black text-[var(--time-dark)] font-[family-name:var(--font-display)] text-center mb-5">
              {t('submit-confirm-title', {
                defaultValue: "Vuoi confermare e inviare l'ordine?",
              })}
            </h3>
            <dl className="text-[14px] divide-y divide-[var(--time-gray-100)]">
              <div className="flex justify-between py-2.5">
                <dt className="text-[var(--time-gray-500)]">
                  {t('submit-delivery-type', {
                    defaultValue: 'Tipo di consegna',
                  })}
                </dt>
                <dd className="font-semibold text-[var(--time-dark)]">
                  {recap.deliveryType}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[var(--time-gray-500)]">
                  {t('submit-delivery-date', {
                    defaultValue: 'Data di spedizione',
                  })}
                </dt>
                <dd className="font-semibold text-[var(--time-dark)]">
                  {recap.deliveryDate}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[var(--time-gray-500)]">
                  {t('submit-items', { defaultValue: 'Articoli' })}
                </dt>
                <dd className="font-semibold text-[var(--time-dark)]">
                  {recap.items}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[var(--time-gray-500)]">
                  {t('submit-net-total', { defaultValue: 'Totale netto' })}
                </dt>
                <dd className="font-semibold text-[var(--time-dark)]">
                  {recap.netTotal}
                </dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-[16px] font-bold text-[var(--time-dark)]">
                  {t('submit-total', { defaultValue: 'Totale' })}
                </dt>
                <dd className="text-[16px] font-black text-[var(--time-red)]">
                  {recap.total}
                </dd>
              </div>
            </dl>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                className={SECONDARY_BTN}
                onClick={flow.cancel}
              >
                {t('submit-cancel', { defaultValue: 'Annulla' })}
              </button>
              <button
                type="button"
                className={PRIMARY_BTN}
                onClick={flow.confirm}
              >
                {t('submit-confirm', { defaultValue: 'Conferma e invia' })}
              </button>
            </div>
          </div>
        )}

        {/* ── Progress (submitting + processing) ────────────────────────── */}
        {(status === 'submitting' || status === 'processing') && (
          <div className="p-7">
            <h3 className="text-[19px] font-black text-[var(--time-dark)] font-[family-name:var(--font-display)] text-center mb-1">
              {t('submit-progress-title', {
                defaultValue: 'Stiamo inviando il tuo ordine',
              })}
            </h3>
            <p className="text-[12px] text-[var(--time-gray-500)] text-center mb-6">
              {t('submit-keep-open', {
                defaultValue:
                  'Per favore, lascia questa pagina aperta così possiamo elaborare correttamente il tuo ordine.',
              })}
            </p>

            <ul className="space-y-3 mb-6">
              {stages.map((s) => {
                const done = flow.stage > s.n;
                const active = flow.stage === s.n;
                return (
                  <li key={s.n} className="flex items-center gap-3">
                    {done ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[13px]">
                        ✓
                      </span>
                    ) : active ? (
                      <Spinner size={18} />
                    ) : (
                      <span className="w-5 h-5 rounded-full border-[2px] border-[var(--time-gray-200)]" />
                    )}
                    <span
                      className={
                        active
                          ? 'text-[14px] font-semibold text-[var(--time-dark)]'
                          : done
                            ? 'text-[14px] text-[var(--time-gray-400)]'
                            : 'text-[14px] text-[var(--time-gray-500)]'
                      }
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="h-1.5 w-full rounded-[var(--radius-btn)] bg-[var(--time-gray-100)] overflow-hidden mb-3">
              <div className="h-full w-1/2 bg-[var(--time-red)] animate-[shine_1.2s_ease_infinite]" />
            </div>
            <p className="text-[13px] text-center text-[var(--time-gray-600)]">
              {progressCopy}
            </p>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────────────── */}
        {status === 'success' && (
          <div className="p-9 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 text-[30px]">
              ✓
            </div>
            <h3 className="text-[19px] font-black text-[var(--time-dark)] font-[family-name:var(--font-display)] mb-1">
              {t('submit-success-title', { defaultValue: 'Ordine completato' })}
            </h3>
            {flow.orderNumber ? (
              <p className="text-[14px] text-[var(--time-gray-600)]">
                {t('submit-order-number', { defaultValue: 'Numero ordine' })}:{' '}
                <span className="font-mono font-bold text-[var(--time-dark)]">
                  {flow.orderNumber}
                </span>
              </p>
            ) : null}
            <div className="mt-5 flex justify-center">
              <Spinner size={18} />
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {status === 'error' && (
          <div className="p-7 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-[var(--time-red)] flex items-center justify-center mx-auto mb-4 text-[26px]">
              !
            </div>
            <h3 className="text-[18px] font-black text-[var(--time-dark)] font-[family-name:var(--font-display)] mb-2">
              {t('submit-error-title', {
                defaultValue: "Errore durante l'invio",
              })}
            </h3>
            <p className="text-[13px] text-[var(--time-gray-600)] mb-6">
              {flow.errorMessage ||
                t('submit-error-generic', {
                  defaultValue: 'Si è verificato un errore. Riprova.',
                })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className={SECONDARY_BTN}
                onClick={flow.close}
              >
                {t('submit-close', { defaultValue: 'Chiudi' })}
              </button>
              <button
                type="button"
                className={PRIMARY_BTN}
                onClick={flow.retry}
              >
                {t('submit-retry', { defaultValue: 'Riprova' })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
