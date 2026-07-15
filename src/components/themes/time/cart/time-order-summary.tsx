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
import { useOrderSubmitFlow } from '@/hooks/use-order-submit-flow';
import TimeOrderSubmitModal from './time-order-submit-modal';
import TimeAnomalyModal from './time-anomaly-modal';
import DuplicateSubmitModal from '@/components/checkout/duplicate-submit-modal';
import { useCoupon } from '@/hooks/use-coupon';
import { applyCouponDiscount } from '@/lib/coupon/discount';
import TimeCouponField from './time-coupon-field';
import { useCartSettings } from '@/hooks/use-cart-settings';
import { minOrderStatus } from '@utils/adapter/cart-adapter';
import { useCartClosureInfo } from '@framework/erp/use-cart-closure';

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
  const { settings: cartSettings } = useCartSettings();
  const { selected: selectedB2B } = useDeliveryAddress();
  const { data: customer } = useCustomerQuery(true);
  const flow = useOrderSubmitFlow(lang);
  const {
    isSubmitting,
    anomalyResult,
    duplicateWarning,
    orderAlreadySubmitted,
    submitError,
    clearAnomalies,
    clearDuplicateWarning,
    clearOrderAlreadySubmitted,
  } = flow;

  // ERP_STATIC is hydrated from localStorage on the client only, so any render
  // condition reading it must wait for mount or SSR/client HTML diverges.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [deliveryType, setDeliveryType] = useState('spedizione');
  // Pickup can be hidden per channel via cart_settings. If it's off while
  // "ritiro" is selected (e.g. toggled after mount), fall back to shipping so we
  // never submit a delivery type the storefront no longer offers.
  useEffect(() => {
    if (!cartSettings.showPickup && deliveryType === 'ritiro') {
      setDeliveryType('spedizione');
    }
  }, [cartSettings.showPickup, deliveryType]);
  const [deliveryDate, setDeliveryDate] = useState(() =>
    toLocalISODate(nextBusinessDay()),
  );
  const [notes, setNotes] = useState('');

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

  // The ERP's minimum-order rule (IMPMIN). Ask the ERP directly rather than
  // relying on erp_data.delivery_info, which only exists when the Windmill
  // cart-create hook is configured for the tenant. The stored value stays as a
  // fallback for tenants where that hook does run.
  const closure = useCartClosureInfo(meta?.orderId);
  const minimumAmount =
    closure?.minimumAmount ?? meta?.minOrder?.minimumAmount ?? 0;

  // Gate on the RAW `net` (pre-coupon subtotal_net), NOT `discounted.net`.
  // The coupon here is display-only: it's applied by MyMB *after* the order
  // syncs, so the ERP re-checks `importo_minimo` against the pre-coupon
  // subtotal_net. Switching this to `discounted.net` would falsely block
  // legitimate orders that only clear the minimum before the coupon discount.
  //
  // Compliance is derived here, NOT read from the ERP's `compliant` flag: that
  // flag reflects the ERP's own cart, which is only in sync once the order is
  // pushed. Our net total is the authoritative one at this point.
  const { belowMinimum, shortfall } = minOrderStatus(net, minimumAmount);

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
  useEffect(() => {
    coupon.checkCouponCart(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const discounted = applyCouponDiscount({ net, vat }, coupon.discountPercent);

  const addressLabel = useMemo(() => {
    if (!selectedB2B) return '';
    return formatAddress(selectedB2B.address ?? selectedB2B);
  }, [selectedB2B]);

  const canSubmit = Boolean(
    selectedB2B &&
      deliveryDate &&
      !isSubmitting &&
      totalItems > 0 &&
      !belowMinimum,
  );

  // Carry the validated coupon with the order submit so it travels to MyMB via the
  // order sync (the cart/order lives in CS — there is no MyMB document id to persist
  // against directly at checkout). Includes the final discounted totals and the MyMB
  // apply endpoint so the sync payload is self-contained.
  const couponPayload = coupon.appliedCoupon
    ? {
        ...coupon.appliedCoupon,
        final: {
          gross,
          net: discounted.net,
          vat: discounted.vat,
          doc: discounted.doc,
          discount: discounted.discount,
        },
      }
    : null;

  const submitOpts = {
    delivery_date: deliveryDate,
    delivery_type: deliveryType === 'ritiro' ? 'pickup' : 'courier',
    notes,
    coupon: couponPayload,
  };

  const recap = {
    deliveryType:
      deliveryType === 'ritiro'
        ? t('delivery-pickup', { defaultValue: 'Ritiro' })
        : t('delivery-shipping', { defaultValue: 'Spedizione' }),
    deliveryDate,
    items: totalItems,
    netTotal: money(discounted.net),
    total: money(discounted.doc),
  };

  const openFlow = () => {
    if (!canSubmit) return;
    flow.open(submitOpts);
  };

  return (
    <>
      <TimeCard className="overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--time-gray-100)]">
          <h3 className="text-[16px] font-extrabold text-[var(--time-dark)] font-[var(--font-display)] mb-1">
            {t('ordersummary-title', { defaultValue: 'Dettagli Ordine' })}
          </h3>
          <p className="text-[12px] text-[var(--time-gray-500)]">
            {t('ordersummary-subtitle', {
              defaultValue: 'Completa il tuo acquisto',
            })}
          </p>
        </div>

        {/* Fields */}
        <div className="px-6 py-4 flex flex-col gap-3.5">
          {/* Company */}
          <div>
            <label className={labelCls}>
              {t('ordersummary-company-name', { defaultValue: 'Nome Azienda' })}
            </label>
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
            <label className={labelCls}>
              {t('ordersummary-delivery-type', {
                defaultValue: 'Tipo di Consegna',
              })}
            </label>
            <div className="flex gap-2">
              {[
                {
                  value: 'spedizione',
                  label: t('ordersummary-shipping', {
                    defaultValue: 'Spedizione',
                  }),
                  icon: <TruckIcon />,
                },
                // "Ritiro" (pickup) is gated by the channel cart_settings flag.
                ...(cartSettings.showPickup
                  ? [
                      {
                        value: 'ritiro',
                        label: t('ordersummary-pickup', {
                          defaultValue: 'Ritiro',
                        }),
                        icon: <ShieldIcon />,
                      },
                    ]
                  : []),
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
              {deliveryType === 'spedizione'
                ? t('ordersummary-date-shipping', {
                    defaultValue: 'Data di Spedizione',
                  })
                : t('ordersummary-date-pickup', {
                    defaultValue: 'Data di Ritiro',
                  })}
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
            <label className={labelCls}>
              {t('ordersummary-address', { defaultValue: 'Indirizzo' })}
            </label>
            <div
              className={cn(
                inputCls,
                'flex items-center bg-[var(--time-gray-50)] cursor-default overflow-hidden',
              )}
              title={addressLabel || undefined}
              suppressHydrationWarning
            >
              <span className="min-w-0 truncate">{addressLabel || '—'}</span>
            </div>
          </div>

          {/* Notes (head note) — toggled per channel via cart_settings */}
          {cartSettings.showHeadNote && (
            <div>
              <label className={labelCls}>
                {t('ordersummary-notes', {
                  defaultValue: 'Note ordine (opzionale)',
                })}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('ordersummary-notes-placeholder', {
                  defaultValue: 'Eventuali note...',
                })}
                rows={2}
                className="w-full rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] px-3.5 py-2.5 text-[13px] font-[var(--font-body)] text-[var(--time-dark)] bg-white outline-none resize-y transition-all focus:border-[var(--time-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]"
              />
            </div>
          )}

          {/* Coupon — shown to any logged-in customer (validate/preview needs
              only customer_code; the cart id is only used for persist/re-display). */}
          {mounted && String(ERP_STATIC.customer_code || '0') !== '0' && (
            <TimeCouponField
              status={coupon.status}
              message={coupon.message}
              onApply={coupon.applyCoupon}
              placeholder={t('coupon.placeholder', {
                defaultValue: 'Codice coupon',
              })}
              applyLabel={t('coupon.apply', { defaultValue: 'Applica' })}
            />
          )}
        </div>

        {/* Totals */}
        <div className="px-6 py-4 border-t border-[var(--time-gray-100)] flex flex-col gap-2">
          {[
            {
              id: 'gross',
              label: t('ordersummary-total-gross', {
                defaultValue: 'Totale lordo',
              }),
              value: gross,
              strike: true,
            },
            {
              id: 'net',
              label: t('ordersummary-total-net', {
                defaultValue: 'Totale netto',
              }),
              value: discounted.net,
              bold: true,
            },
            {
              id: 'vat',
              label: t('ordersummary-vat', { defaultValue: 'IVA (22%)' }),
              value: discounted.vat,
            },
          ].map((row) => (
            <div
              key={row.id}
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
              <span className="font-semibold">
                {t('ordersummary-savings', { defaultValue: 'Risparmi' })}
              </span>
              <span className="font-bold">−{money(savings)}</span>
            </div>
          )}

          {coupon.discountPercent > 0 && (
            <div className="flex justify-between items-center text-[12px] text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg mt-0.5">
              <span className="font-semibold">
                {t('coupon.discountLine', { defaultValue: 'Sconto coupon' })} −
                {coupon.discountPercent}%
              </span>
              <span className="font-bold">−{money(discounted.discount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t-2 border-[var(--time-gray-100)] mt-1">
            <span className="text-[14px] font-bold text-[var(--time-dark)]">
              {t('orders-total', { defaultValue: 'Totale' })}
            </span>
            <span className="text-[26px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums">
              {money(discounted.doc)}
            </span>
          </div>
        </div>

        {belowMinimum && (
          <div className="mx-6 mb-4 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-red)] bg-[rgba(230,57,70,0.06)] px-4 py-3">
            <p className="text-[13px] font-bold text-[var(--time-red)]">
              {t('text-min-order-title', {
                defaultValue: 'Importo minimo d’ordine non raggiunto',
              })}
            </p>
            <p className="mt-1 text-[12px] text-[var(--time-gray-600)] tabular-nums">
              {t('text-min-order-detail', {
                defaultValue: 'Minimo {{min}} — mancano {{missing}}',
                min: money(minimumAmount),
                missing: money(shortfall),
              })}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={openFlow}
            disabled={!canSubmit}
            className={cn(
              'w-full h-[52px] rounded-xl border-none text-[15px] font-extrabold font-[var(--font-display)] tracking-wide flex items-center justify-center gap-2.5 transition-all',
              canSubmit
                ? 'bg-[var(--time-dark)] text-white shadow-[0_4px_16px_rgba(26,29,35,0.2)] hover:bg-[var(--time-red)] hover:shadow-[0_4px_20px_rgba(230,57,70,0.3)] cursor-pointer'
                : 'bg-[var(--time-gray-200)] text-[var(--time-gray-400)] cursor-not-allowed',
            )}
          >
            {t('ordersummary-submit', { defaultValue: 'Completa Ordine' })}{' '}
            <ArrowRight />
          </button>
        </div>
      </TimeCard>

      {/* ── Inline submit flow (confirm → progress → success/error) ────── */}
      <TimeOrderSubmitModal lang={lang} flow={flow} recap={recap} />

      {/* ── Anomaly Modal (422 ERP validation) ─────────────────────────── */}
      {anomalyResult && (
        <TimeAnomalyModal
          lang={lang}
          result={anomalyResult}
          isSubmitting={isSubmitting}
          onAutofix={flow.runAutofix}
          onEdit={clearAnomalies}
          onClose={clearAnomalies}
        />
      )}

      {/* ── Duplicate submit warning (422 Windmill ordini guard) ───────── */}
      {duplicateWarning && (
        <DuplicateSubmitModal
          warning={duplicateWarning}
          isSubmitting={isSubmitting}
          onConfirm={flow.confirmDuplicate}
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
