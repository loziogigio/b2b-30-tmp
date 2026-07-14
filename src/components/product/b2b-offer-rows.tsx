'use client';

import React from 'react';
import cn from 'classnames';
import { HiOutlineCalendar } from 'react-icons/hi';
import {
  formatYmdToItalian,
  type ErpPriceData,
  type PackagingOption,
  type PromoOffer,
} from '@utils/transform/erp-prices';
import { useTranslation } from 'src/app/i18n/client';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import PackagingGrid from './packaging-grid';
import AddToCart from './add-to-cart';
import { formatPriceIt } from '@utils/money';
import { isNetPricePromoType } from '@utils/promo';
import { cleanTitle, qualifyingOffers } from '@framework/pricing/best-price';

type Props = {
  lang: string;
  product: any;
  priceData?: ErpPriceData;
};

/**
 * Build a synthetic ErpPriceData for a single promo line so AddToCart
 * uses the promo's qty step, prices, and code/row.
 */
/**
 * Pick the best promo offer that the LISTINO's default packaging already
 * triggers (i.e. promo MV ≤ listino default qty step). Mirrors the legacy
 * `is_improving_promo` flow where adding the listino qty automatically applies
 * the promo. Returns null when no offer fits.
 */
export function pickImprovingOffer(
  priceData?: ErpPriceData | null,
): PromoOffer | null {
  if (!priceData) return null;
  const matches = qualifyingOffers(priceData);
  if (!matches.length) return null;
  // Cheapest qualifying promo.
  return matches.reduce((best, cur) =>
    cur.promo_net_price < best.promo_net_price ? cur : best,
  );
}

export function buildPromoPriceData(
  base: ErpPriceData,
  offer: PromoOffer,
): ErpPriceData {
  const baseDefault = base.packaging_option_default;
  const promoStep = Math.max(offer.promo_qty_required || 0, 1);

  // `packaging_option_default` drives AddToCart's step — the MV
  // (Minimum Vendita) for this promo. We carry promoStep here so the
  // qty counter increments in multiples of the min purchasable amount.
  const stepPackaging: PackagingOption = {
    packaging_uom_description: baseDefault?.packaging_uom_description ?? '',
    packaging_code: baseDefault?.packaging_code ?? 'MV',
    packaging_is_default: true,
    packaging_is_smallest: false,
    qty_x_packaging: promoStep,
    packaging_uom: baseDefault?.packaging_uom ?? '',
  };

  // The grid column should show the *catalog* packaging size (CFZ = 1
  // piece), not the inflated promo step. Reuse the listino's default
  // packaging so the buyer sees "CFZ 1" alongside the "MV 2" header.
  const displayPackaging: PackagingOption = baseDefault
    ? { ...baseDefault, packaging_is_default: true }
    : stepPackaging;

  // Net-price promos (RigaPrezzoNettoQuantitaMinima &c.) ship a flat
  // unit price; the discount_percentage is informational, not a
  // contractual discount, so drop it from the cart-line discount_extra.
  // Otherwise the cart adapter would write discount1=N on a line whose
  // unit_price is already the final net.
  const netPriceOnly = isNetPricePromoType(offer.promo_type);

  return {
    ...base,
    net_price: offer.promo_net_price,
    price_discount: offer.promo_net_price,
    gross_price: netPriceOnly
      ? offer.promo_net_price
      : offer.promo_ref_list_price || base.gross_price,
    is_promo: true,
    promo: true,
    promo_price: offer.promo_net_price,
    promo_code: offer.promo_code,
    promo_row: offer.promo_row,
    promo_title: offer.promo_title,
    promo_type: offer.promo_type,
    end_promo_date: offer.promo_end_date,
    start_promo_date: offer.promo_start_date,
    // Tier-discount % values for the small "-X%" line above the headline.
    // Empty for net-price promos so neither the storefront chip nor the
    // cart payload's discount1..6 records a stacked percentage.
    discount_extra: netPriceOnly ? [] : offer.promo_extra_discounts,
    packaging_option_default: stepPackaging,
    // Override the listino's smallest packaging too so the cart counter's
    // snap-multiple matches the promo step — otherwise a typed "3" on a
    // qty=2 promo line could pass through unchanged.
    packaging_option_smallest: stepPackaging,
    // Show only the promo's sellable packaging in the grid for this row,
    // with its original catalog qty (not the promo step).
    packaging_options_all: [displayPackaging],
  };
}

export default function B2BOfferRows({ lang, product, priceData }: Props) {
  const { t } = useTranslation(lang, 'common');
  const { hidePrices, isAuthorized } = useUI();
  const { settings } = useHomeSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;

  if (!priceData) return null;
  const offers = priceData.all_promo_offers ?? [];
  const canAdd = priceData.product_label_action?.ADD_TO_CART !== false;

  const baseGross = Number(priceData.gross_price ?? 0);
  const baseNet = Number(priceData.price_discount ?? priceData.net_price ?? 0);

  // When the ERP flags this product as `is_improving_promo`, the buyer's
  // default packaging already triggers the best promo — adding via the
  // LISTINO row would create a non-promo cart line at the same price. Match
  // the legacy behaviour and let only the PROMO rows drive the add-to-cart.
  const isImprovingPromo = Boolean((priceData as any).is_improving_promo);
  const showListinoCounter = !(isImprovingPromo && offers.length > 0);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border-base bg-white shadow-sm">
      {/* LISTINO row */}
      <Row
        label={t('text-listino', { defaultValue: 'LISTINO' })}
        labelTone="neutral"
      >
        <PackCol>
          <PackagingGrid pd={priceData} />
        </PackCol>

        {!hidePrices ? (
          <PriceCol>
            <PriceCell
              decimals={decimals}
              gross={baseGross}
              net={baseNet}
              extraDiscounts={[]}
            />
          </PriceCol>
        ) : (
          <div className="md:flex-1" />
        )}

        <CartCol>
          {showListinoCounter ? (
            <CartCell
              isAuthorized={isAuthorized}
              lang={lang}
              product={product}
              priceData={priceData}
              disabled={!canAdd}
            />
          ) : (
            <span className="w-full text-center text-[11px] font-medium text-gray-500">
              {t('text-add-via-promo', {
                defaultValue: 'Aggiungi tramite offerta ↓',
              })}
            </span>
          )}
        </CartCol>
      </Row>

      {offers.map((offer) => {
        const promoPriceData = buildPromoPriceData(priceData, offer);
        const variation = {
          id: `promo-${offer.promo_code}-${offer.promo_row}`,
          title: offer.promo_title || `Promo ${offer.promo_code}`,
          price: offer.promo_net_price,
          quantity: priceData.availability ?? 0,
        } as any;
        const serverItemId = priceData.entity_code ?? product?.id;

        return (
          <Row
            key={`${offer.promo_code}-${offer.promo_row}`}
            label={t('text-promo', { defaultValue: 'PROMO' })}
            labelTone="promo"
            title={cleanTitle(offer.promo_title)}
            endDate={formatYmdToItalian(offer.promo_end_date)}
          >
            <PackCol>
              {/* Promo first column shows MV (Minima Vendita) with the
                  minimum purchasable qty for the offer, not the duplicate
                  UM/PZ pair from the LISTINO row. */}
              <PackagingGrid
                pd={promoPriceData}
                umLabel="MV"
                uom={String(Math.max(Number(offer.promo_qty_required ?? 1), 1))}
              />
            </PackCol>

            {!hidePrices ? (
              <PriceCol>
                {(() => {
                  // Net-price promos hide the strike + discount chip
                  // because the promo_net_price is the final price (no
                  // percentage stacking on top of the listino).
                  const netPriceOnly = isNetPricePromoType(offer.promo_type);
                  return (
                    <PriceCell
                      decimals={decimals}
                      gross={
                        netPriceOnly
                          ? offer.promo_net_price
                          : offer.promo_ref_list_price || baseGross
                      }
                      net={offer.promo_net_price}
                      extraDiscounts={
                        netPriceOnly ? [] : offer.promo_extra_discounts
                      }
                    />
                  );
                })()}
              </PriceCol>
            ) : (
              <div className="md:flex-1" />
            )}

            <CartCol>
              <CartCell
                isAuthorized={isAuthorized}
                lang={lang}
                product={product}
                priceData={promoPriceData}
                variation={variation}
                serverItemId={serverItemId}
                disabled={!canAdd}
              />
            </CartCol>
          </Row>
        );
      })}
    </div>
  );
}

function Row({
  label,
  labelTone,
  title,
  endDate,
  children,
}: {
  label: string;
  labelTone: 'neutral' | 'promo';
  title?: string;
  endDate?: string;
  children: React.ReactNode;
}) {
  const isPromo = labelTone === 'promo';
  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-3 py-3 transition-colors md:flex-row md:items-center md:gap-3',
        'border-t border-border-base first:border-t-0',
        isPromo
          ? 'bg-gradient-to-r from-red-50/70 to-transparent'
          : 'bg-white hover:bg-gray-50/40',
      )}
    >
      <div className="flex shrink-0 flex-col gap-1 md:w-[95px]">
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
            isPromo
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200',
          )}
        >
          {label}
        </span>
        {title ? (
          <span className="text-[12px] font-medium text-gray-700 line-clamp-2">
            {title}
          </span>
        ) : null}
        {endDate ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
            <HiOutlineCalendar className="h-3.5 w-3.5" />
            {endDate}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function PackCol({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-center">{children}</div>;
}

function PriceCol({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end md:ml-auto md:w-[130px]">
      {children}
    </div>
  );
}

function CartCol({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center md:w-[130px]">{children}</div>
  );
}

function PriceCell({
  decimals,
  gross,
  net,
  extraDiscounts,
}: {
  decimals: number;
  gross: number;
  net: number;
  extraDiscounts: number[];
}) {
  // Only strike when there's a real markdown (gross > net). Equal values
  // mean no MSRP discount — don't render a misleading line-through.
  const showStrike = gross > 0 && Number(gross) > Number(net);
  const discounts = (extraDiscounts ?? []).filter((v) => v && v !== 0);
  // Render the raw % with no trailing zeros: 1 → "-1%", 0.47 → "-0.47%".
  const fmtDiscount = (d: number) => `-${Math.abs(Number(d))}%`;
  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      {showStrike && (
        <div className="flex flex-col items-end leading-tight">
          <span className="text-xs text-gray-400 line-through">
            {formatPriceIt(gross, decimals)} €
          </span>
          {discounts.length > 0 && (
            <span className="text-[10px] font-bold text-red-600">
              {discounts.map(fmtDiscount).join(' ')}
            </span>
          )}
        </div>
      )}
      <span
        className={cn(
          'flex items-baseline gap-0.5 font-bold leading-none tabular-nums',
          showStrike ? 'text-red-600' : 'text-gray-900',
        )}
      >
        <span className="text-xl md:text-2xl">
          {formatPriceIt(net, decimals)}
        </span>
        <span className="text-sm font-semibold">€</span>
      </span>
    </div>
  );
}

function CartCell({
  isAuthorized,
  lang,
  product,
  priceData,
  variation,
  serverItemId,
  disabled,
}: {
  isAuthorized: boolean;
  lang: string;
  product: any;
  priceData: ErpPriceData;
  variation?: any;
  serverItemId?: string | number;
  disabled?: boolean;
}) {
  if (!isAuthorized) return <div />;
  return (
    <div className="flex w-full min-w-0 items-center">
      <AddToCart
        lang={lang}
        product={product}
        variation={variation}
        priceData={priceData}
        serverItemId={serverItemId}
        disabled={disabled}
        size="sm"
        className="w-full"
      />
    </div>
  );
}
