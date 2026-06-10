'use client';

import React, { useMemo, useState, useEffect } from 'react';
import cn from 'classnames';
import { useCart } from '@contexts/cart/cart.context';
import { useDeliveryAddress } from '@contexts/address/address.context';
import { useCustomerQuery } from '@framework/acccount/fetch-account';
import { formatAddress } from '@utils/format-address';
import { ERP_STATIC } from '@framework/utils/static';
import { TimeCard } from '@/components/themes/time/account/time-account-primitives';
import { useTranslation } from 'src/app/i18n/client';
import { useOrderSubmit } from '@/hooks/use-order-submit';
import TimeAnomalyModal from './time-anomaly-modal';
import DuplicateSubmitModal from '@/components/checkout/duplicate-submit-modal';
import { useCoupon } from '@/hooks/use-coupon';
import { applyCouponDiscount } from '@/lib/coupon/discount';
import TimeCouponField from './time-coupon-field';

// ── helpers ──────────────────────────────────────────────────────────────────

const money = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    n,
  );

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const nextBusinessDay = (from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
};
const toLocalISODate = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

// ── icons ────────────────────────────────────────────────────────────────────

const s = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeWidth: 2,
};

const TruckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ArrowRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12,5 19,12 12,19" />
  </svg>
);

const CheckCircle = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
  >
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22,4 12,14.01 9,11.01" />
  </svg>
);

// ── label cls ────────────────────────────────────────────────────────────────

const labelCls =
  'block text-[11px] font-bold text-[var(--time-gray-600)] uppercase tracking-[0.06em] mb-1.5 font-[var(--font-body)]';
const inputCls =
  'w-full h-[42px] rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] px-3.5 text-[13px] font-[var(--font-body)] text-[var(--time-dark)] bg-white outline-none transition-all focus:border-[var(--time-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]';

// ── component ────────────────────────────────────────────────────────────────

interface TimeOrderSummaryProps {
  lang: string;
}

export default function TimeOrderSummary({ lang }: TimeOrderSummaryProps) {
  const { t } = useTranslation(lang, 'common');
  const { items, meta } = useCart();
  const { selected: selectedB2B } = useDeliveryAddress();
  const { data: customer } = useCustomerQuery(true);
  const {
    submitOrder,
    resubmitWithAutofix,
    confirmDuplicateSubmit,
    isSubmitting,
    anomalyResult,
    duplicateWarning,
    orderAlreadySubmitted,
    submitError,
    clearAnomalies,
    clearDuplicateWarning,
    clearOrderAlreadySubmitted,
  } = useOrderSubmit(lang);

  const [deliveryType, setDeliveryType] = useState('spedizione');
  const [deliveryDate, setDeliveryDate] = useState(() =>
    toLocalISODate(nextBusinessDay()),
  );
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const availableItems = useMemo(
    () => (items ?? []).filter((i: any) => i.stock !== 0),
    [items],
  );
  const totalItems = availableItems.length;

  const gross = meta?.totalGross ?? 0;
  const net = meta?.totalNet ?? 0;
  const vat = meta?.vat ?? 0;
  const doc = meta?.totalDoc ?? 0;
  const savings = gross - net;

  // Active cart/document id for coupon persist + re-display. This tenant's
  // checkout drives the order off meta.orderId / vinc_order_id (the legacy
  // ERP_STATIC.id_cart is the pricing id and is often "0" here), so prefer the
  // same id the order submit uses, falling back to id_cart.
  const couponCartId = String(
    meta?.orderId || ERP_STATIC.vinc_order_id || ERP_STATIC.id_cart || '',
  );
  const coupon = useCoupon({
    customerCode: String(ERP_STATIC.customer_code || ''),
    idCart: couponCartId,
  });
  // Re-display a coupon already saved on the cart.
  useEffect(() => { coupon.checkCouponCart(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const discounted = applyCouponDiscount({ net, vat }, coupon.discountPercent);

  const addressLabel = useMemo(() => {
    if (!selectedB2B) return '';
    return formatAddress(selectedB2B.address ?? selectedB2B);
  }, [selectedB2B]);

  const canSubmit = Boolean(
    selectedB2B && deliveryDate && !isSubmitting && totalItems > 0,
  );

  const submitOpts = {
    delivery_date: deliveryDate,
    delivery_type: deliveryType === 'ritiro' ? 'pickup' : 'courier',
    notes,
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await coupon.persistCoupon(); // best-effort; no-op when no valid coupon applied
    await submitOrder(submitOpts);
    setShowConfirm(false);
  };

  return (
    <>
      <TimeCard className="overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--time-gray-100)]">
          <h3 className="text-[16px] font-extrabold text-[var(--time-dark)] font-[var(--font-display)] mb-1">
            Dettagli Ordine
          </h3>
          <p className="text-[12px] text-[var(--time-gray-500)]">
            Completa il tuo acquisto
          </p>
        </div>

        {/* Fields */}
        <div className="px-6 py-4 flex flex-col gap-3.5">
          {/* Company */}
          <div>
            <label className={labelCls}>Nome Azienda</label>
            <div
              className={cn(
                inputCls,
                'flex items-center bg-[var(--time-gray-50)] cursor-default font-semibold',
              )}
              suppressHydrationWarning
            >
              {customer?.businessName || ERP_STATIC.username || '—'}
            </div>
          </div>

          {/* Delivery type */}
          <div>
            <label className={labelCls}>Tipo di Consegna</label>
            <div className="flex gap-2">
              {[
                {
                  value: 'spedizione',
                  label: 'Spedizione',
                  icon: <TruckIcon />,
                },
                { value: 'ritiro', label: 'Ritiro', icon: <ShieldIcon /> },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDeliveryType(opt.value)}
                  className={cn(
                    'flex-1 h-[42px] rounded-[var(--radius-btn)] text-[12px] font-semibold font-[var(--font-body)] flex items-center justify-center gap-2 transition-all',
                    deliveryType === opt.value
                      ? 'bg-[var(--time-dark)] text-white border-2 border-[var(--time-dark)]'
                      : 'bg-white text-[var(--time-gray-600)] border-[1.5px] border-[var(--time-gray-200)] hover:border-[var(--time-dark)]',
                  )}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>
              Data di {deliveryType === 'spedizione' ? 'Spedizione' : 'Ritiro'}
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>Indirizzo</label>
            <div
              className={cn(
                inputCls,
                'flex items-center bg-[var(--time-gray-50)] cursor-default text-ellipsis overflow-hidden whitespace-nowrap',
              )}
              suppressHydrationWarning
            >
              {addressLabel || '—'}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Note ordine (opzionale)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eventuali note..."
              rows={2}
              className="w-full rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] px-3.5 py-2.5 text-[13px] font-[var(--font-body)] text-[var(--time-dark)] bg-white outline-none resize-y transition-all focus:border-[var(--time-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]"
            />
          </div>

          {/* Coupon — shown to any logged-in customer (validate/preview needs
              only customer_code; the cart id is only used for persist/re-display). */}
          {String(ERP_STATIC.customer_code || '0') !== '0' && (
            <TimeCouponField
              status={coupon.status}
              message={coupon.message}
              onApply={coupon.applyCoupon}
              placeholder={t('coupon.placeholder', { defaultValue: 'Codice coupon' })}
              applyLabel={t('coupon.apply', { defaultValue: 'Applica' })}
            />
          )}
        </div>

        {/* Totals */}
        <div className="px-6 py-4 border-t border-[var(--time-gray-100)] flex flex-col gap-2">
          {[
            { label: 'Totale lordo', value: gross, strike: true },
            { label: 'Totale netto', value: discounted.net, bold: true },
            { label: 'IVA (22%)', value: discounted.vat },
          ].map((row) => (
            <div
              key={row.label}
              className="flex justify-between items-center text-[13px] text-[var(--time-gray-600)]"
            >
              <span>{row.label}</span>
              <span
                className={cn(
                  'tabular-nums',
                  row.strike && 'line-through text-[var(--time-gray-400)]',
                  row.bold && 'font-semibold text-[var(--time-dark)]',
                )}
              >
                {money(row.value)}
              </span>
            </div>
          ))}

          {savings > 0 && (
            <div className="flex justify-between items-center text-[12px] text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg mt-0.5">
              <span className="font-semibold">Risparmi</span>
              <span className="font-bold">−{money(savings)}</span>
            </div>
          )}

          {coupon.discountPercent > 0 && (
            <div className="flex justify-between items-center text-[12px] text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg mt-0.5">
              <span className="font-semibold">{t('coupon.discountLine', { defaultValue: 'Sconto coupon' })} −{coupon.discountPercent}%</span>
              <span className="font-bold">−{money(discounted.discount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t-2 border-[var(--time-gray-100)] mt-1">
            <span className="text-[14px] font-bold text-[var(--time-dark)]">
              Totale
            </span>
            <span className="text-[26px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums">
              {money(discounted.doc)}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canSubmit}
            className={cn(
              'w-full h-[52px] rounded-xl border-none text-[15px] font-extrabold font-[var(--font-display)] tracking-wide flex items-center justify-center gap-2.5 transition-all',
              canSubmit
                ? 'bg-[var(--time-dark)] text-white shadow-[0_4px_16px_rgba(26,29,35,0.2)] hover:bg-[var(--time-red)] hover:shadow-[0_4px_20px_rgba(230,57,70,0.3)] cursor-pointer'
                : 'bg-[var(--time-gray-200)] text-[var(--time-gray-400)] cursor-not-allowed',
            )}
          >
            Completa Ordine <ArrowRight />
          </button>
        </div>
      </TimeCard>

      {/* ── Confirmation Modal ──────────────────────────────────────────── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[20px] p-10 max-w-[420px] w-[90%] text-center shadow-2xl animate-[slideUp_0.3s_ease_both]"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5 text-emerald-600">
              <CheckCircle />
            </div>
            <h2 className="text-[22px] font-black text-[var(--time-dark)] font-[var(--font-display)] mb-2">
              Confermi l&apos;ordine?
            </h2>
            <p className="text-[14px] text-[var(--time-gray-500)] mb-2 leading-relaxed">
              {totalItems} articol{totalItems > 1 ? 'i' : 'o'} per un totale di
            </p>
            <div className="text-[34px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums mb-6">
              {money(discounted.doc)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-12 rounded-xl border-[1.5px] border-[var(--time-gray-200)] bg-white text-[14px] font-bold text-[var(--time-gray-600)] font-[var(--font-body)] hover:bg-[var(--time-gray-50)] transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  'flex-1 h-12 rounded-xl border-none text-[14px] font-bold text-white font-[var(--font-body)] transition-all shadow-[0_4px_16px_rgba(230,57,70,0.25)]',
                  isSubmitting
                    ? 'bg-[var(--time-gray-400)] cursor-not-allowed'
                    : 'bg-[var(--time-red)] hover:bg-[var(--time-dark)] cursor-pointer',
                )}
              >
                {isSubmitting ? 'Invio in corso...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Anomaly Modal (422 ERP validation) ─────────────────────────── */}
      {anomalyResult && (
        <TimeAnomalyModal
          result={anomalyResult}
          isSubmitting={isSubmitting}
          onAutofix={() => resubmitWithAutofix(submitOpts)}
          onEdit={clearAnomalies}
          onClose={clearAnomalies}
        />
      )}

      {/* ── Duplicate submit warning (422 Windmill ordini guard) ───────── */}
      {duplicateWarning && (
        <DuplicateSubmitModal
          warning={duplicateWarning}
          isSubmitting={isSubmitting}
          onConfirm={() => confirmDuplicateSubmit(submitOpts)}
          onCancel={clearDuplicateWarning}
        />
      )}

      {/* ── Already-submitted notice ───────────────────────────────────── */}
      {orderAlreadySubmitted && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-amber-600 text-white px-5 py-4 rounded-xl shadow-lg text-[13px] font-[var(--font-body)] animate-[slideUp_0.3s_ease_both]">
          <div className="mb-2">
            {t('text-order-already-submitted', {
              defaultValue:
                'Questo ordine è già stato inviato. Ricarica la pagina per vedere lo stato aggiornato.',
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              clearOrderAlreadySubmitted();
              if (typeof window !== 'undefined') window.location.reload();
            }}
            className="text-xs font-semibold underline hover:text-amber-100"
          >
            {t('text-reload', { defaultValue: 'Ricarica' })}
          </button>
        </div>
      )}

      {/* ── Submit error toast ─────────────────────────────────────────── */}
      {submitError && !anomalyResult && !duplicateWarning && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[var(--time-red)] text-white px-5 py-3 rounded-xl shadow-lg text-[13px] font-[var(--font-body)] animate-[slideUp_0.3s_ease_both]">
          {submitError}
        </div>
      )}
    </>
  );
}
