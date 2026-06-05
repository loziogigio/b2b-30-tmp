'use client';

/**
 * Time-theme catalog list row ("item in line") — DFL La Mura restyle.
 *
 * A time-only sibling of ProductRowB2B: same data wiring (batched variant
 * prices, promo gating, favourites/reminders, AddToCart) rendered as a
 * scannable spec-table — one product image, the model/size as the bold
 * leading column, quiet packaging tags, tight price + stepper columns.
 *
 * isAuthorized gates ONLY the quantity stepper; everything else (model,
 * packaging, availability, price) is visible to anonymous visitors.
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from '@components/ui/image';
import Link from 'next/link';
import { useTranslation } from 'src/app/i18n/client';
import { useModalAction } from '@components/common/modal/modal.context';
import type { Product } from '@framework/types';
import { productPlaceholder } from '@assets/placeholders';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { buildPackagingParts } from '@utils/packaging';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { useProductsPriceMap } from '@framework/pricing';
import {
  buildPromoPriceData,
  pickImprovingOffer,
} from '@components/product/b2b-offer-rows';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import { TimeAlreadyPurchasedBadge } from '../product/time-promo-gated-cta';

const AddToCart = dynamic(() => import('@components/product/add-to-cart'), {
  ssr: false,
});

/* ---------- palette — brand-driven via the time CSS vars, DFL fallbacks ---------- */
const C = {
  // Brand: adapts to the tenant's primary / text colour (--time-red / --time-dark).
  red: 'var(--time-red, #e4002b)',
  redSoft: 'color-mix(in srgb, var(--time-red, #e4002b) 10%, #ffffff)',
  ink: 'var(--time-dark, #16161a)',
  // Neutral chrome (theme grays, DFL fallbacks).
  muted: 'var(--time-gray-500, #71717a)',
  faint: 'var(--time-gray-400, #a1a1aa)',
  line: 'var(--time-gray-100, #eaeaee)',
  lineSoft: 'var(--time-gray-50, #f2f2f5)',
  bg: '#ffffff',
  panel: 'var(--time-gray-50, #fafafb)',
  // Semantic availability colours (not brand-tinted).
  green: '#15803d',
  greenSoft: '#ecfdf3',
  amber: '#b45309',
  amberSoft: '#fff7ed',
};

const GRID_COLS = 'minmax(180px,1.1fr) 168px 168px 168px 120px';

interface Props {
  lang: string;
  product: Product & { variantCount?: number };
}

/* ---------- helpers ---------- */
function netOf(pd?: ErpPriceData): number | null {
  const a = pd as any;
  const n =
    a?.price_discount ?? a?.net_price ?? a?.price_gross ?? a?.gross_price;
  return n != null && Number(n) > 0 ? Number(n) : null;
}
function listOf(pd?: ErpPriceData): number | null {
  const a = pd as any;
  // Same field order as the grid card so the struck list price matches.
  const n = a?.price_gross ?? a?.gross_price;
  return n != null ? Number(n) : null;
}
/* ---------- atoms ---------- */
function fmtEuro(n: number, decimals: number) {
  // Match the grid card exactly: '€' prefix + fixed decimals.
  return `€${n.toFixed(decimals)}`;
}

// Availability indicator — same format as the grid card: a coloured dot plus
// the "Disponibile" / "Non disponibile" label (no qty pill).
function StockPill({ label, ok }: { label: string; ok: boolean }) {
  const color = ok ? 'var(--time-success, #16a34a)' : 'var(--time-red, #dc2626)';
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

export default function TimeProductRow({ lang, product }: Props) {
  const { t } = useTranslation(lang, 'common');
  const { openModal } = useModalAction();
  const likes = useLikes();
  const reminders = useReminders();
  const { isAuthorized, hidePrices } = useUI();
  const { settings } = useHomeSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;

  const {
    name,
    image,
    sku,
    parent_sku,
    brand,
    description,
    variations = [],
  } = product ?? {};

  // Pseudo single row when the product has no variations.
  const variantRows: any[] = useMemo(
    () =>
      (variations?.length ?? 0) > 0
        ? (variations as any[])
        : [{ ...product, __pseudo: true }],
    [variations, product],
  );

  const hasMultiple = (variations?.length ?? 0) > 1;
  const [open, setOpen] = useState(!hasMultiple);

  // Lazy pricing: only fetch variant prices once the rows are expanded
  // (collapsed multi-variant parents skip the price roundtrip entirely).
  const variantPriceMap = useProductsPriceMap(open ? variantRows : []);
  const getVariantPrice = (id: string | number): ErpPriceData | undefined =>
    variantPriceMap[String(id)];

  const singleVar: any =
    (variations as any[])?.length === 1 ? (variations as any[])[0] : null;
  // Variants quick-view only for true multi-variant parents; everything else
  // (a single product, or a clicked variant row) opens the product-detail popup.
  const openQuick = (item?: any) => {
    const payload = item ?? singleVar ?? product;
    const modal = item
      ? 'PRODUCT_VIEW'
      : hasMultiple
        ? 'B2B_PRODUCT_VARIANTS_QUICK_VIEW'
        : 'PRODUCT_VIEW';
    openModal(modal, payload);
  };

  // Representative variant — parents frequently carry no display data of their
  // own, so name/brand/image fall back to the first informative variant.
  const rep: any =
    variantRows.find(
      (v) => v?.name || v?.image?.thumbnail?.trim() || (v?.brand as any)?.name,
    ) ??
    variantRows[0] ??
    null;
  const displayName = name || rep?.name || parent_sku || '';
  const displayDescription = description || rep?.description || '';
  const displayBrand: any =
    (brand as any)?.brand_id || (brand as any)?.name
      ? brand
      : (rep?.brand ?? brand);
  const headerImg =
    (image?.thumbnail?.trim() ? image.thumbnail : rep?.image?.thumbnail) ||
    productPlaceholder;

  // Sorted by SKU for a stable spec-table order.
  const sorted = useMemo(
    () =>
      variantRows
        .slice()
        .sort((a, b) =>
          String(a.sku ?? a.id).localeCompare(String(b.sku ?? b.id)),
        ),
    [variantRows],
  );

  // Parent price range.
  const priceRange = useMemo(() => {
    const nets = sorted
      .map((v) => netOf(getVariantPrice(v.id)))
      .filter((n): n is number => n != null);
    if (!nets.length) return null;
    return { min: Math.min(...nets), max: Math.max(...nets) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, variantPriceMap]);

  const collapsedCount = product.variantCount || variations?.length || 0;

  // Loader on expand: show a spinner only while a real ERP price fetch can be
  // in flight — i.e. for an authorized customer. Anonymous visitors never hit
  // the ERP endpoint (useProductsPriceMap gates the fetch on isAuthorized), so
  // there is nothing to wait for: the variant table renders immediately, the
  // same way the product card and the variants popup do. Bounded by a timeout
  // so a price-less authorized product can't spin forever.
  const pricesArrived = sorted.some((v) => getVariantPrice(v.id));
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (!open || !hasMultiple || !isAuthorized) {
      setWaited(false);
      return;
    }
    const id = setTimeout(() => setWaited(true), 6000);
    return () => clearTimeout(id);
  }, [open, hasMultiple, isAuthorized]);
  const loadingVariants =
    open && hasMultiple && isAuthorized && !pricesArrived && !waited;

  return (
    <article
      style={{
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        background: C.bg,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(20,20,26,.03)',
      }}
    >
      {/* ---------- header ---------- */}
      <div style={{ display: 'flex', gap: 16, padding: 16 }}>
        <button
          type="button"
          onClick={() => openQuick()}
          style={{
            width: 88,
            height: 88,
            borderRadius: 10,
            background: C.panel,
            border: `1px solid ${C.line}`,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            position: 'relative',
            cursor: 'pointer',
            padding: 0,
            overflow: 'hidden',
          }}
          title={displayName || 'Prodotto'}
        >
          <Image
            src={headerImg}
            alt={displayName || 'Prodotto'}
            width={88}
            height={88}
            className="object-contain"
            style={{ width: 88, height: 88, objectFit: 'contain' }}
          />
        </button>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16 }}>
          {/* left: name · brand · description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: C.ink,
                letterSpacing: '-.015em',
              }}
            >
              {displayName || '—'}
            </div>
            {((parent_sku || product.id) || displayBrand?.name) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 5,
                }}
              >
                {(parent_sku || product.id) && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '.06em',
                      color: '#fff',
                      background: C.red,
                      padding: '2px 7px',
                      borderRadius: 5,
                    }}
                  >
                    {parent_sku || product.id}
                  </span>
                )}
                {displayBrand?.name &&
                  ((displayBrand as any)?.brand_id ? (
                    <Link
                      href={`/${lang}/search?filters-brand_id=${(displayBrand as any).brand_id}`}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: C.faint,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                      }}
                    >
                      {displayBrand.name}
                    </Link>
                  ) : (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: C.faint,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                      }}
                    >
                      {displayBrand.name}
                    </span>
                  ))}
              </div>
            )}

            {displayDescription && (
              <p
                style={{
                  fontSize: 12.5,
                  color: C.muted,
                  lineHeight: 1.5,
                  margin: '8px 0 0',
                  maxWidth: 640,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                title={displayDescription}
              >
                {displayDescription}
              </p>
            )}
          </div>

          {/* right: brand logo pinned top, price range + variants toggle pinned
              bottom (one line). */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'flex-start',
              gap: 8,
              flexShrink: 0,
            }}
          >
            {(displayBrand as any)?.logo_url &&
              (displayBrand as any).logo_url.trim() !== '' &&
              ((displayBrand as any)?.brand_id ? (
                <Link
                  href={`/${lang}/search?filters-brand_id=${(displayBrand as any).brand_id}`}
                  title={displayBrand?.name || 'Brand'}
                  style={{ display: 'block', lineHeight: 0 }}
                >
                  <img
                    src={(displayBrand as any).logo_url}
                    alt={displayBrand?.name || 'Brand'}
                    style={{ height: 34, maxWidth: 150, objectFit: 'contain' }}
                  />
                </Link>
              ) : (
                <img
                  src={(displayBrand as any).logo_url}
                  alt={displayBrand?.name || 'Brand'}
                  style={{ height: 34, maxWidth: 150, objectFit: 'contain' }}
                />
              ))}

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              {!hidePrices && hasMultiple && priceRange && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: C.faint,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                    }}
                  >
                    da
                  </span>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: C.ink,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtEuro(priceRange.min, decimals)}
                  </span>
                  {priceRange.max !== priceRange.min && (
                    <>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: C.faint,
                        }}
                      >
                        a
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.faint,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmtEuro(priceRange.max, decimals)}
                      </span>
                    </>
                  )}
                </div>
              )}

              {hasMultiple && (
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: C.red,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {open ? (
                    <IoChevronDown size={15} />
                  ) : (
                    <IoChevronForward size={15} />
                  )}
                  {open
                    ? t('hide-variants', { defaultValue: 'Nascondi' })
                    : t('show-variants', { defaultValue: 'Mostra' })}{' '}
                  {collapsedCount}{' '}
                  {t('text-variants', { defaultValue: 'varianti' })}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- variants spec table ---------- */}
      {(open || !hasMultiple) && (
        <div style={{ borderTop: `1px solid ${C.line}`, background: C.bg }}>
          {loadingVariants && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '32px 14px',
                color: C.muted,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <span
                className="animate-spin"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: `3px solid ${C.lineSoft}`,
                  borderTopColor: C.red,
                  display: 'inline-block',
                }}
              />
              {t('text-loading', { defaultValue: 'Caricamento…' })}
            </div>
          )}
          {!loadingVariants && hasMultiple && (
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
                {t('text-availability', { defaultValue: 'Disponibilità' })}
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

          {!loadingVariants &&
            sorted.map((v, i) => {
              const isPseudo = !!v.__pseudo;
              const vPrice = getVariantPrice(v.id);
              const matchingOffer = vPrice ? pickImprovingOffer(vPrice) : null;
              const dPrice =
                matchingOffer && vPrice
                  ? buildPromoPriceData(vPrice, matchingOffer)
                  : vPrice;
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
              const isFav = targetSku ? likes.isLiked(targetSku) : false;
              const vImg = v.image?.thumbnail || headerImg;
              const net = netOf(dPrice);
              const list = listOf(dPrice);
              const hasDiscount = net != null && list != null && list > net;
              // Full discount tier chain (e.g. "-50% -8%"), same as the card.
              const tiers = (dPrice as any)?.discount_description || '';
              const avail = vPrice ? Number(vPrice.availability) : 0;
              const uom = vPrice?.packaging_option_default?.packaging_uom;
              const packParts = dPrice ? buildPackagingParts(dPrice) : [];

              const promoCount = (vPrice as any)?.all_promo_offers?.length ?? 0;
              const hasPromo =
                promoCount > 0 ||
                Boolean((vPrice as any)?.promo) ||
                Boolean((vPrice as any)?.is_promo);
              const isImproving = Boolean((vPrice as any)?.is_improving_promo);
              const promoNeedsDetail =
                hasPromo && (promoCount > 1 || !isImproving);

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
                      i < sorted.length - 1
                        ? `1px solid ${C.lineSoft}`
                        : 'none',
                  }}
                >
                  {/* MODEL — fav + thumbnail + bold size + size bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      minWidth: 0,
                    }}
                  >
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
                          style={{
                            width: 44,
                            height: 44,
                            objectFit: 'contain',
                          }}
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
                      <div
                        style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}
                      >
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
                    {vPrice && (
                      <StockPill
                        ok={avail > 0}
                        label={
                          avail > 0
                            ? t('text-in-stock', { defaultValue: 'Disponibile' })
                            : (vPrice as any)?.product_label_action?.LABEL ||
                              t('text-out-stock', {
                                defaultValue: 'Non disponibile',
                              })
                        }
                      />
                    )}
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
                          {t('text-view-offers', {
                            defaultValue: 'VEDI OFFERTE',
                          })}
                        </button>
                      ) : (
                        <AddToCart
                          product={isPseudo ? (product as any) : v}
                          priceData={dPrice}
                          variation={promoVariation}
                          serverItemId={
                            matchingOffer
                              ? (vPrice?.entity_code ??
                                (isPseudo ? product?.id : v.id))
                              : undefined
                          }
                          variant="venus"
                          lang={lang}
                          className="time-stepper"
                          showPlaceholder={false}
                        />
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </article>
  );
}
