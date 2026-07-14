'use client';

/**
 * Time-theme variant spec-table — extracted from TimeProductRow so the same
 * scannable row layout (model · availability · packaging · price · qty) is
 * reused by the catalog list view AND the variants quick-view modal's list
 * mode. Pure presentational: the owner fetches prices and passes `priceMap`.
 */

import dynamic from 'next/dynamic';
import Image from '@components/ui/image';
import { useTranslation } from 'src/app/i18n/client';
import { useProductOpen } from '@/hooks/use-product-open';
import { useCatalogSettings } from '@/hooks/use-catalog-settings';
import { formatTimeAvailability } from './format-time-availability';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { buildPackagingParts } from '@utils/packaging';
import { useLikes } from '@contexts/likes/likes.context';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { buildCartPriceData } from '@components/product/b2b-offer-rows';
import { selectBestPrice } from '@framework/pricing/best-price';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import { TimeAlreadyPurchasedBadge } from './time-promo-gated-cta';
import { C, fmtEuro, listOf, netOf } from './time-row-helpers';

const AddToCart = dynamic(() => import('@components/product/add-to-cart'), {
  ssr: false,
});

const GRID_COLS = 'minmax(180px,1.1fr) 168px 168px 168px 120px';

function StockPill({ label, ok }: { label: string; ok: boolean }) {
  const color = ok
    ? 'var(--time-success, #16a34a)'
    : 'var(--time-red, #dc2626)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

interface TimeVariantsTableProps {
  lang: string;
  parent: any;
  variants: any[];
  priceMap: Record<string, ErpPriceData>;
  brand?: any;
  fallbackImg?: string;
  showColumnHeader?: boolean;
}

export default function TimeVariantsTable({
  lang,
  parent,
  variants,
  priceMap,
  brand,
  fallbackImg,
  showColumnHeader = true,
}: TimeVariantsTableProps) {
  const { t } = useTranslation(lang, 'common');
  const openProduct = useProductOpen(lang);
  const likes = useLikes();
  const { isAuthorized, hidePrices } = useUI();
  const { settings } = useHomeSettings();
  const { settings: catalogSettings } = useCatalogSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;

  const sku = parent?.sku;
  const displayBrand: any = brand;
  const headerImg = fallbackImg;
  // A clicked variant row is a "single product view" (→ detail page when
  // product_open_mode = detail_page, else the PRODUCT_VIEW modal). Mirrors
  // TimeProductRow / the grid cards via the shared useProductOpen hook.
  const openQuick = (item: any) => openProduct(item, false);
  const getVariantPrice = (id: string | number): ErpPriceData | undefined =>
    priceMap[String(id)];

  return (
    <div>
      {showColumnHeader && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: GRID_COLS,
            gap: 12,
            padding: '8px 14px 8px 13px',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: C.faint,
            background: C.panel,
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <span>{t('text-model', { defaultValue: 'Modello' })}</span>
          <span>
            {isAuthorized
              ? t('text-availability', { defaultValue: 'Disponibilità' })
              : null}
          </span>
          <span>{t('text-packaging', { defaultValue: 'Confezione' })}</span>
          <span style={{ textAlign: 'right' }}>
            {t('text-price', { defaultValue: 'Prezzo' })}
          </span>
          <span style={{ textAlign: 'right' }}>
            {t('text-quantity', { defaultValue: 'Quantità' })}
          </span>
        </div>
      )}

      {variants.map((v, i) => {
        const isPseudo = !!v.__pseudo;
        const vPrice = getVariantPrice(v.id);
        // Only substitute the promo when it actually sets the displayed price
        // (i.e. it beats the listino). When the listino wins, `offer` is null
        // and buildCartPriceData books the listino that is shown.
        const matchingOffer = vPrice ? selectBestPrice(vPrice).offer : null;
        const dPrice = vPrice ? buildCartPriceData(vPrice) : vPrice;
        const promoVariation = matchingOffer
          ? ({
              id: `promo-${matchingOffer.promo_code}-${matchingOffer.promo_row}`,
              title:
                matchingOffer.promo_title ||
                `Promo ${matchingOffer.promo_code}`,
              price: matchingOffer.promo_net_price,
              quantity: vPrice?.availability ?? 0,
            } as any)
          : undefined;

        const targetSku = String(v.sku ?? sku ?? '').trim();
        const isFav =
          isAuthorized && targetSku ? likes.isLiked(targetSku) : false;
        const vImg = v.image?.thumbnail || headerImg;
        const net = netOf(dPrice);
        const list = listOf(dPrice);
        const hasDiscount = net != null && list != null && list > net;
        const tiers = (dPrice as any)?.discount_description || '';
        const packParts = dPrice ? buildPackagingParts(dPrice) : [];

        const promoCount = (vPrice as any)?.all_promo_offers?.length ?? 0;
        const hasPromo =
          promoCount > 0 ||
          Boolean((vPrice as any)?.promo) ||
          Boolean((vPrice as any)?.is_promo);
        const isImproving = Boolean((vPrice as any)?.is_improving_promo);
        const promoNeedsDetail = hasPromo && (promoCount > 1 || !isImproving);

        return (
          <div
            key={v.id ?? i}
            style={{
              display: 'grid',
              gridTemplateColumns: GRID_COLS,
              alignItems: 'center',
              gap: 12,
              padding: '9px 14px 9px 10px',
              borderLeft: `3px solid transparent`,
              borderBottom:
                i < variants.length - 1 ? `1px solid ${C.lineSoft}` : 'none',
            }}
          >
            {/* MODEL — fav + thumbnail + bold size + sku/brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                minWidth: 0,
              }}
            >
              {isAuthorized && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (targetSku) likes.toggle(targetSku);
                  }}
                  title={t('text-wishlist')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    color: isFav ? C.red : C.faint,
                    lineHeight: 0,
                  }}
                >
                  {isFav ? (
                    <IoIosHeart size={16} />
                  ) : (
                    <IoIosHeartEmpty size={16} />
                  )}
                </button>
              )}
              {!isPseudo && (
                <button
                  type="button"
                  onClick={() => openQuick(v)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: C.bg,
                    border: `1px solid ${C.line}`,
                    flexShrink: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title={v.name ?? v.sku ?? ''}
                >
                  <Image
                    src={vImg}
                    alt={v.name ?? v.sku ?? ''}
                    width={44}
                    height={44}
                    className="object-contain"
                    style={{ width: 44, height: 44, objectFit: 'contain' }}
                  />
                </button>
              )}
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: C.ink,
                    letterSpacing: '-.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={v.model || v.name || ''}
                >
                  {v.model || v.name || v.sku}
                </span>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                  <span style={{ color: C.ink, fontWeight: 700 }}>
                    {v.sku ?? sku ?? '—'}
                  </span>
                  {displayBrand?.name && (
                    <>
                      <span style={{ color: C.faint }}> · </span>
                      <span
                        style={{
                          color: C.red,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {displayBrand.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* availability + ordered */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                alignItems: 'flex-start',
              }}
            >
              {isAuthorized &&
                vPrice &&
                vPrice?.availability != null &&
                (() => {
                  const a = formatTimeAvailability(
                    vPrice,
                    catalogSettings.availabilityDisplay,
                    t,
                  );
                  return <StockPill ok={a.ok} label={a.label} />;
                })()}
              {vPrice?.buy_did && (
                <TimeAlreadyPurchasedBadge
                  priceData={vPrice}
                  t={t}
                  size="sm"
                  inline
                />
              )}
            </div>

            {/* packaging — quiet dotted string */}
            <div
              style={{
                fontSize: 11.5,
                color: C.muted,
                fontWeight: 600,
                lineHeight: 1.4,
                letterSpacing: '-0.01em',
              }}
            >
              {packParts.join(' · ')}
            </div>

            {/* price */}
            <div style={{ textAlign: 'right' }}>
              {!hidePrices && net != null ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: C.ink,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                    }}
                  >
                    {fmtEuro(net, decimals)}
                  </span>
                  {hasDiscount && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        lineHeight: 1.15,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11.5,
                          color: C.faint,
                          textDecoration: 'line-through',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmtEuro(list!, decimals)}
                      </span>
                      {tiers && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.muted,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tiers}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ color: C.faint, fontSize: 13 }}>—</span>
              )}
            </div>

            {/* quantity — the only auth-gated control */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {isAuthorized && net != null ? (
                promoNeedsDetail ? (
                  <button
                    type="button"
                    onClick={() => openQuick(v)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: C.red,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {t('text-view-offers', { defaultValue: 'VEDI OFFERTE' })}
                  </button>
                ) : (
                  <AddToCart
                    product={isPseudo ? (parent as any) : v}
                    priceData={dPrice}
                    variation={promoVariation}
                    serverItemId={
                      matchingOffer
                        ? (vPrice?.entity_code ??
                          (isPseudo ? parent?.id : v.id))
                        : undefined
                    }
                    variant="venus"
                    lang={lang}
                    className="time-stepper time-stepper-color"
                    showPlaceholder={false}
                  />
                )
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
