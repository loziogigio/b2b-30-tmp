'use client';

/**
 * Time-theme catalog list row ("item in line") — DFL La Mura restyle.
 *
 * A time-only sibling of ProductRowB2B: the parent header (image, name,
 * brand, price range, expand toggle) plus the batched variant price fetch.
 * The scannable variant spec-table itself is rendered by the shared
 * <TimeVariantsTable> so the same layout powers the variants quick-view
 * modal's list mode.
 *
 * isAuthorized gates ONLY the quantity stepper; everything else (model,
 * packaging, availability, price) is visible to anonymous visitors.
 */

import { useEffect, useMemo, useState } from 'react';
import Image from '@components/ui/image';
import Link from 'next/link';
import { useTranslation } from 'src/app/i18n/client';
import { useProductOpen } from '@/hooks/use-product-open';
import type { Product } from '@framework/types';
import { productPlaceholder } from '@assets/placeholders';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { useProductPriceData, useProductsPriceMap } from '@framework/pricing';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import TimeVariantsTable from '../product/time-variants-table';
import { C, fmtEuro, listOf, netOf } from '../product/time-row-helpers';

interface Props {
  lang: string;
  product: Product & { variantCount?: number };
  priceData?: ErpPriceData;
}

export default function TimeProductRow({ lang, product, priceData }: Props) {
  const { t } = useTranslation(lang, 'common');
  const openProduct = useProductOpen(lang);
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
    // A clicked variant row, or a single product, is a "single product view"
    // (→ detail page when product_open_mode = detail_page). Only a true
    // multi-variant parent opens the variants quick-view modal.
    if (item) {
      openProduct(item, false);
      return;
    }
    if (hasMultiple) {
      openProduct(product, true);
      return;
    }
    openProduct(singleVar ?? product, false);
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

  // Parent's own price — multi-variant parents have no ERP entity code so we
  // skip the fetch (enabled: !hasMultiple) and show the range from variantPriceMap
  // instead. For single-variant rows the batched priceData override is used when
  // available, falling back to a normal per-product fetch when not.
  const parentPriceData = useProductPriceData(product, {
    override: priceData,
    enabled: !hasMultiple,
  });
  const parentNet = netOf(parentPriceData);
  const parentList = listOf(parentPriceData);
  const parentHasDiscount =
    parentNet != null && parentList != null && parentList > parentNet;
  const parentTiers = (parentPriceData as any)?.discount_description || '';

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
            {(parent_sku || product.id || displayBrand?.name) && (
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
              {!hidePrices && hasMultiple && parentNet != null ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: C.ink,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtEuro(parentNet, decimals)}
                  </span>
                  {parentHasDiscount && (
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: C.faint,
                        textDecoration: 'line-through',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtEuro(parentList!, decimals)}
                    </span>
                  )}
                  {parentHasDiscount && parentTiers && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.muted,
                      }}
                    >
                      {parentTiers}
                    </span>
                  )}
                </div>
              ) : !hidePrices && hasMultiple && priceRange ? (
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
              ) : null}

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
                    ? t('hide-n-variants', {
                        n: collapsedCount,
                        defaultValue: 'Nascondi {{n}} varianti',
                      })
                    : t('show-n-variants', {
                        n: collapsedCount,
                        defaultValue: 'Mostra {{n}} varianti',
                      })}
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
          {!loadingVariants && (
            <TimeVariantsTable
              lang={lang}
              parent={product}
              variants={sorted}
              priceMap={variantPriceMap}
              brand={displayBrand}
              fallbackImg={headerImg}
              showColumnHeader={hasMultiple}
            />
          )}
        </div>
      )}
    </article>
  );
}
