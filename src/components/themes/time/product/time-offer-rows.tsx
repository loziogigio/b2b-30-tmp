'use client';

import React from 'react';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { HiOutlineCalendar } from 'react-icons/hi';
import { IoArrowForwardOutline } from 'react-icons/io5';
import {
  formatYmdToItalian,
  type ErpPriceData,
  type PromoOffer,
} from '@utils/transform/erp-prices';
import { buildDisplayPackaging, buildPackagingParts } from '@utils/packaging';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { useCart } from '@contexts/cart/cart.context';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import { buildPromoPriceData } from '@components/product/b2b-offer-rows';
import AddToCart from '@components/product/add-to-cart';
import { ROUTES } from '@utils/routes';
import { NET_PRICE_PROMO_TYPES } from '@utils/promo';

type Props = {
  lang: string;
  product: any;
  priceData?: ErpPriceData;
};

type TFn = (key: string, opts?: { defaultValue?: string }) => string;

// ── Formatters ──────────────────────────────────────────────────────────────

/** Format a numeric value to a fixed-decimal string; empty when not finite. */
const fmtNum = (v: unknown, decimals: number): string => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(decimals) : '';
};

/** Drop placeholder titles ("---", "___", "   ") that ERP sometimes emits. */
const cleanTitle = (raw?: string): string => {
  if (!raw) return '';
  return raw.replace(/[-_\s]/g, '') ? raw.trim() : '';
};

/**
 * Split a multi-word label into ~2 balanced lines for narrow CTAs.
 * "Vedi articoli dell'offerta" → ["Vedi articoli", "dell'offerta"].
 * Returns a single-element array when the label has ≤2 words.
 */
const splitLabelLines = (label: string): string[] => {
  const trimmed = label.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= 2) return [trimmed];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
};

/**
 * Renders the product's pricing as a stack of rows: a base "LISTINO" row
 * plus one row per active promo offer. Each promo row also shows a
 * threshold-based requirement panel when the promo needs a minimum cart
 * amount or piece count to qualify (mirrors the legacy dfl-b2b
 * ProductPromoAction view).
 */
export default function TimeOfferRows({ lang, product, priceData }: Props) {
  const { t } = useTranslation(lang, 'common');
  const { hidePrices, isAuthorized } = useUI();
  const { settings } = useHomeSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;
  const cart = useCart() as any;
  const cartItems: any[] = Array.isArray(cart?.items) ? cart.items : [];

  if (!priceData) return null;
  const offers = priceData.all_promo_offers ?? [];
  const canAdd = priceData.product_label_action?.ADD_TO_CART !== false;

  const baseGross = Number(priceData.gross_price ?? 0);
  // When promo offers exist, `price_discount`/`net_price` reflect the best deal
  // (including the promo). The LISTINO row should instead show the listino-only
  // net price, which the offers expose as `promo_ref_list_price`.
  const listinoOnlyNet =
    offers.length > 0
      ? Number(offers[0].promo_ref_list_price ?? 0)
      : Number(priceData.price_discount ?? priceData.net_price ?? 0);
  const baseNet = listinoOnlyNet;
  const baseDiscountList = (priceData.discount ?? []).filter(
    (v) => v && v !== 0,
  );
  const baseDiscountTiers = baseDiscountList
    .map((d) => `-${Math.abs(d)}%`)
    .join(' ');

  const isImprovingPromo = Boolean((priceData as any).is_improving_promo);
  const showListinoCounter = !(isImprovingPromo && offers.length > 0);

  return (
    <div className="overflow-hidden rounded-[14px] border-2 border-[var(--time-gray-100)] bg-white">
      <Row
        label={t('text-listino', { defaultValue: 'LISTINO' })}
        labelTone="neutral"
        product={product}
        priceData={priceData}
        decimals={decimals}
        gross={baseGross}
        net={baseNet}
        discountTiers={baseDiscountTiers}
        hidePrices={hidePrices}
        t={t}
        cart={
          showListinoCounter ? (
            <CartCell
              isAuthorized={isAuthorized}
              lang={lang}
              product={product}
              priceData={priceData}
              disabled={!canAdd}
            />
          ) : (
            <span className="text-[11px] font-semibold text-[var(--time-gray-500)] text-center w-full">
              {t('text-add-via-promo', {
                defaultValue: 'Aggiungi tramite offerta ↓',
              })}
            </span>
          )
        }
      />

      {offers.map((offer) => {
        const promoPriceData = buildPromoPriceData(priceData, offer);
        const variation = {
          id: `promo-${offer.promo_code}-${offer.promo_row}`,
          title: offer.promo_title || `Promo ${offer.promo_code}`,
          price: offer.promo_net_price,
          quantity: priceData.availability ?? 0,
        } as any;
        const serverItemId = priceData.entity_code ?? product?.id;
        // PROMO row strikes against the original listino gross (€77.08),
        // not the listino-discounted price (€38.54). The combined discount
        // chip below already conveys the listino tier.
        const promoNet = offer.promo_net_price;
        const promoExtraList = (offer.promo_extra_discounts ?? []).filter(
          (v) => v && v !== 0,
        );
        // Legacy ProductPromoAction.vue: when the offer is a flat net-price
        // promo (e.g. SCONTO PREZZO NETTO / min-value / sum-quantity) or has
        // no extra discounts to stack, suppress the strike-through gross AND
        // the SCONTO chip — the price is already the final number.
        const isNetPricePromo =
          NET_PRICE_PROMO_TYPES.has(offer.promo_type as string) ||
          promoExtraList.length === 0;
        const promoGross = isNetPricePromo
          ? promoNet
          : baseGross || offer.promo_ref_list_price;
        const discountTiers = isNetPricePromo
          ? ''
          : [...baseDiscountList, ...promoExtraList]
              .map((d) => `-${Math.abs(d)}%`)
              .join(' ');

        return (
          <Row
            key={`${offer.promo_code}-${offer.promo_row}`}
            label={t('text-promo', { defaultValue: 'PROMO' })}
            labelTone="promo"
            title={cleanTitle(offer.promo_title)}
            endDate={formatYmdToItalian(offer.promo_end_date)}
            product={product}
            priceData={promoPriceData}
            decimals={decimals}
            gross={promoGross}
            net={promoNet}
            discountTiers={discountTiers}
            hidePrices={hidePrices}
            t={t}
            cart={
              <CartCell
                isAuthorized={isAuthorized}
                lang={lang}
                product={product}
                priceData={promoPriceData}
                variation={variation}
                serverItemId={serverItemId}
                disabled={!canAdd}
              />
            }
            footer={
              <PromoRequirement
                offer={offer}
                cartItems={cartItems}
                decimals={decimals}
                lang={lang}
                t={t}
              />
            }
          />
        );
      })}
    </div>
  );
}

type RowProps = {
  label: string;
  labelTone: 'neutral' | 'promo';
  title?: string;
  endDate?: string;
  product: any;
  priceData: ErpPriceData;
  decimals: number;
  gross: number;
  net: number;
  discountTiers?: string;
  hidePrices: boolean;
  t: TFn;
  cart: React.ReactNode;
  footer?: React.ReactNode;
};

function Row({
  label,
  labelTone,
  title,
  endDate,
  product,
  priceData,
  decimals,
  gross,
  net,
  discountTiers,
  hidePrices,
  t,
  cart,
  footer,
}: RowProps) {
  const { openModal } = useModalAction();
  const isPromo = labelTone === 'promo';
  // Only strike when there's a real markdown (retail > list). Equal values
  // mean no MSRP discount — don't render a misleading line-through.
  const showStrike = !hidePrices && gross > 0 && Number(gross) > Number(net);
  const savings = showStrike
    ? (Number(gross) - Number(net)).toFixed(decimals)
    : null;
  const packagingParts = buildPackagingParts(priceData);
  // From three options up the inline "CRT: 20 · Epal 120: 640 · …" list gets
  // unwieldy — surface a compact trigger that opens the packaging modal.
  const packagingOptions = buildDisplayPackaging(priceData);
  const showPackagingModal = packagingOptions.length >= 3;

  return (
    <div
      className={cn(
        'px-5 py-4 border-t border-[var(--time-gray-100)] first:border-t-0',
        isPromo ? 'bg-[rgba(230,57,70,0.04)]' : 'bg-white',
      )}
    >
      {/* Header line: label + strike + SCONTO chip + packaging — all inline */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-[3px] text-[11px] font-extrabold uppercase tracking-wider font-[family-name:var(--font-body)] shrink-0',
            isPromo
              ? 'bg-[var(--time-red)] text-white'
              : 'bg-[var(--time-gray-50)] text-[var(--time-gray-600)] border border-[var(--time-gray-200)]',
          )}
        >
          {label}
        </span>
        {title ? (
          <span className="text-[12px] font-bold text-[var(--time-dark)] truncate font-[family-name:var(--font-body)]">
            {title}
          </span>
        ) : null}
        {endDate ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--time-red)] tabular-nums whitespace-nowrap">
            <HiOutlineCalendar className="h-3.5 w-3.5" />
            {endDate}
          </span>
        ) : null}

        {showStrike && (
          <span className="text-[12px] sm:text-[13px] text-[var(--time-gray-400)] line-through tabular-nums whitespace-nowrap">
            &euro;{fmtNum(gross, decimals)}
          </span>
        )}

        {showStrike && discountTiers && (
          <span className="inline-flex items-center gap-1.5 bg-[#fef2f2] rounded-md px-2 py-[3px] whitespace-nowrap">
            <span className="text-[11px] font-bold text-[var(--time-red)] uppercase font-[family-name:var(--font-body)]">
              {t('text-discount', { defaultValue: 'Sconto' })}
            </span>
            <span className="text-[11px] font-semibold text-[var(--time-dark)] tabular-nums">
              {discountTiers}
            </span>
          </span>
        )}

        {showPackagingModal ? (
          // Three or more packaging options: keep the first two inline and
          // offer a clickable arrow that opens the full breakdown.
          <button
            type="button"
            onClick={() =>
              openModal('TIME_PACKAGING_VIEW', {
                sku: product?.sku,
                name: product?.name,
                options: packagingOptions,
              })
            }
            title={t('text-packaging-items', {
              defaultValue: 'Imballi articoli',
            })}
            className="ml-auto inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer group"
          >
            <span className="text-[11px] sm:text-xs text-[var(--time-gray-400)] font-mono">
              {packagingParts.slice(0, 3).join(' · ')} …
            </span>
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--time-red)] text-white transition-colors group-hover:bg-[var(--time-dark)]">
              <IoArrowForwardOutline className="h-3 w-3 -rotate-45 transition-transform group-hover:-translate-y-px" />
            </span>
          </button>
        ) : (
          packagingParts.length > 0 && (
            <span className="ml-auto text-[11px] sm:text-xs text-[var(--time-gray-400)] font-mono shrink-0 whitespace-nowrap">
              {packagingParts.join(' · ')}
            </span>
          )
        )}
      </div>

      {/* Bottom row: net price + savings + qty controls */}
      {!hidePrices && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {Number(net) > 0 ? (
              <>
                <span className="text-[28px] sm:text-[32px] font-[900] text-[var(--time-dark)] font-[family-name:var(--font-heading)] tabular-nums tracking-[-0.02em] leading-none">
                  &euro;{fmtNum(net, decimals)}
                </span>
                {savings && (
                  <span className="bg-[#f0fdf4] text-[#059669] text-[12px] sm:text-[13px] font-bold px-2.5 py-1 rounded-md tabular-nums">
                    {t('text-savings', { defaultValue: 'Risparmi' })} &euro;
                    {savings}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[15px] text-[var(--time-gray-400)]">
                &mdash;
              </span>
            )}
          </div>
          <div className="shrink-0">{cart}</div>
        </div>
      )}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}

type CartCellProps = {
  isAuthorized: boolean;
  lang: string;
  product: any;
  priceData: ErpPriceData;
  variation?: any;
  serverItemId?: string | number;
  disabled?: boolean;
};

function CartCell({
  isAuthorized,
  lang,
  product,
  priceData,
  variation,
  serverItemId,
  disabled,
}: CartCellProps) {
  if (!isAuthorized) return <div />;
  return (
    <AddToCart
      lang={lang}
      product={product}
      variation={variation}
      priceData={priceData}
      serverItemId={serverItemId}
      disabled={disabled}
      size="sm"
      showPlaceholder={false}
    />
  );
}

/** Per-line unit price (handles both camelCase and legacy snake_case fields). */
const lineUnitPrice = (it: any): number =>
  Number(
    it?.priceDiscount ??
      it?.price_discount ??
      it?.priceGross ??
      it?.price_gross ??
      it?.gross_price ??
      it?.price ??
      0,
  );

/** Aggregate cart-line contributions toward a given promo_code. */
function sumCartForPromo(cartItems: any[], promoCode: unknown) {
  const matching = cartItems.filter(
    (it) =>
      String(it?.promo_code ?? 0) === String(promoCode ?? 0) &&
      Number(it?.quantity ?? 0) > 0,
  );
  const pieces = matching.reduce((s, it) => s + Number(it?.quantity ?? 0), 0);
  const value = matching.reduce(
    (s, it) => s + lineUnitPrice(it) * Number(it?.quantity ?? 0),
    0,
  );
  return { pieces, value };
}

/** Promo types that require a minimum order value. */
const MIN_VALUE_PROMO_TYPES = new Set(['RigaValoreMinimoSconto']);
/** Promo types that require a minimum piece count. */
const MIN_PIECES_PROMO_TYPES = new Set([
  'RigaCartoniNumeroArticoli',
  'RigaASommaQuantitàArticoli',
]);
/**
 * Threshold-based promo requirement panel — shown when a promo requires a
 * minimum cart amount or piece count to qualify (e.g. €100 of items in the
 * promo, or 12 cartoni). Mirrors the legacy dfl-b2b ProductPromoAction view.
 */
function PromoRequirement({
  offer,
  cartItems,
  decimals,
  lang,
  t,
}: {
  offer: PromoOffer;
  cartItems: any[];
  decimals: number;
  lang: string;
  t: TFn;
}) {
  const router = useRouter();
  const { closeAll } = useModalAction();
  const modalState = useModalState() as { isOpen?: boolean } | undefined;

  const isMinValue =
    MIN_VALUE_PROMO_TYPES.has(offer.promo_type as string) ||
    offer.promo_min_value > 0;
  const isMinPieces =
    MIN_PIECES_PROMO_TYPES.has(offer.promo_type as string) ||
    offer.promo_min_pieces > 0;

  if (!isMinValue && !isMinPieces) return null;

  const { pieces, value } = sumCartForPromo(cartItems, offer.promo_code);
  const required = isMinValue ? offer.promo_min_value : offer.promo_min_pieces;
  const current = isMinValue ? value : pieces;
  const missing = Math.max(0, Number(required) - Number(current));
  const fulfilled = missing === 0 && current > 0;
  const inProgress = !fulfilled && current > 0;

  const fmt = (n: number) =>
    isMinValue ? `€${n.toFixed(decimals)}` : String(Math.round(n));

  const necessaryLabel = isMinValue
    ? t('text-amount-needed', { defaultValue: 'Importo necessario' })
    : t('text-pieces-needed', { defaultValue: 'Articoli necessari' });
  const missingLabel = isMinValue
    ? t('text-amount-missing', { defaultValue: 'Importo mancante' })
    : t('text-pieces-missing', { defaultValue: 'Articoli mancanti' });

  const goToOfferItems = () => {
    const url = `/${lang}${ROUTES.SEARCH}?filters-promo_code=${encodeURIComponent(
      String(offer.promo_code),
    )}`;
    // When triggered from a product preview modal, close it first so the
    // search page is fully visible after navigation.
    if (modalState?.isOpen) closeAll();
    router.push(url);
  };

  // Split the CTA label into two balanced lines so the button stays compact
  // alongside the stacked necessary / missing pills (e.g. "VEDI ARTICOLI" /
  // "DELL'OFFERTA"). Falls back to a single line when the label is short.
  const seeOfferLines = splitLabelLines(
    t('text-see-offer-items', {
      defaultValue: "Vedi articoli dell'offerta",
    }),
  );

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch">
      {/* Necessary — always solid red. Two rows: label on top, amount below. */}
      <div className="flex-1 flex flex-col items-center justify-center rounded-[10px] bg-[var(--time-red)] text-white px-3 py-2.5">
        <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide leading-tight font-[family-name:var(--font-body)] text-center">
          {necessaryLabel}
        </span>
        <span className="mt-1 text-[16px] sm:text-[18px] font-[900] tabular-nums leading-none font-[family-name:var(--font-heading)]">
          {fmt(Number(required))}
        </span>
      </div>

      {/* Missing — green if fulfilled, gray if in progress, red outline if not started. */}
      <div
        className={cn(
          'flex-1 flex flex-col items-center justify-center rounded-[10px] px-3 py-2.5 border-2',
          fulfilled
            ? 'bg-[#059669] border-[#059669] text-white'
            : inProgress
              ? 'bg-[var(--time-gray-50)] border-[var(--time-gray-200)] text-[var(--time-dark)]'
              : 'bg-white border-[var(--time-red)] text-[var(--time-red)]',
        )}
      >
        <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide leading-tight font-[family-name:var(--font-body)] text-center">
          {missingLabel}
        </span>
        <span className="mt-1 text-[16px] sm:text-[18px] font-[900] tabular-nums leading-none font-[family-name:var(--font-heading)]">
          {fmt(missing)}
        </span>
      </div>

      {/* CTA: go to all items in this promo. Label wraps to two lines. */}
      <button
        type="button"
        onClick={goToOfferItems}
        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--time-dark)] hover:bg-black text-white px-4 py-2.5 cursor-pointer transition-colors font-[family-name:var(--font-body)]"
      >
        <span className="flex flex-col text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide leading-tight text-center">
          {seeOfferLines.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </span>
        <IoArrowForwardOutline size={14} />
      </button>
    </div>
  );
}
