'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import cn from 'classnames';
import Image from '@components/ui/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslation } from 'src/app/i18n/client';
import { useModalAction } from '@components/common/modal/modal.context';
import { Product } from '@framework/types';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import PackagingGrid from '../packaging-grid';
import { formatAvailability } from '@utils/format-availability';
import PriceAndPromo from '../price-and-promo';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useUI } from '@contexts/ui.context';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import { IoNotificationsOutline, IoNotifications } from 'react-icons/io5';
import VariantsFilterBar from './variants-filter-bar';

const AddToCart = dynamic(() => import('@components/product/add-to-cart'), { ssr: false });

type GetPrice = (id: string | number) => ErpPriceData | undefined;

interface Props {
  lang: string;
  product: Product;                  // parent (or flattened single-variation)
  getPrice: GetPrice;
  priceData?: ErpPriceData;          // parent price (or single-variation)
  className?: string;
  // show Search + Model tags controls only if variant count >= this value
  filterThreshold?: number;
  // Only hide search+sort below this threshold; tags remain visible
  searchSortThreshold?: number;
}

// Parent row: 3 columns (image | info | brand)
const GRID_PARENT_3 =
  'grid grid-cols-1 sm:grid-cols-[110px_1fr_128px] gap-3 sm:gap-4 items-start';


/** 6 fixed columns (image | info | packaging | ordered | price | add) */
const GRID =
  'grid grid-cols-1 sm:grid-cols-[110px_1.35fr_1.1fr_0.7fr_0.95fr_0.8fr] gap-3 sm:gap-4 items-stretch';

/** vertical dividers between columns on ≥sm */
const GRID_COL_DIVIDERS =
  'sm:[&>*]:border-gray-200 sm:[&>*:last-child]:border-r-0';

const PARENT_IMG = 110;                 // px
const VARIANT_IMG = Math.round((PARENT_IMG * 2) / 3); // 73–74 px

const Cell = ({ className, children }: any) => (
  <div className={cn('min-w-0 self-center', className)}>{children}</div>
);

const Dash = () => <span className="text-gray-300">—</span>;


export default function ProductRowB2B({
  lang,
  product,
  getPrice,
  priceData,
  className,
  filterThreshold = 0,
  searchSortThreshold = 10,
}: Props) {
  const { t } = useTranslation(lang, 'common');
  const { openModal } = useModalAction();
  const likes = useLikes();
  const reminders = useReminders();
  const { isAuthorized } = useUI();

  const {
    name,
    image,
    sku,
    parent_sku,
    brand,
    description,
    variations = [],
  } = product ?? {};

  const parentSku = parent_sku;
  const isVariable = (variations?.length ?? 0) > 1;

  const singleVar = variations?.length === 1 ? variations[0] : null;

  const [reminderLoading, setReminderLoading] = useState<Record<string, boolean>>({});

  // update this helper so it can accept a specific item (variant)
  const openQuick = (item?: Product) => {
    const payload = item ?? (singleVar ?? product);
    const modal = item ? 'PRODUCT_VIEW' : (isVariable ? 'B2B_PRODUCT_VARIANTS_QUICK_VIEW' : 'PRODUCT_VIEW');
    openModal(modal, payload);
  };


  /** Se non ci sono varianti, mostriamo comunque una “riga variante”
   * senza immagine e con i dati del parent. Se c’è una sola variante,
   * mostriamo direttamente la riga (senza toggle).
   */
  const variantRows: Array<any> = useMemo(() => {
    if ((variations?.length ?? 0) > 0) return variations;
    return [
      {
        ...product,
        __pseudo: true,
      },
    ];
  }, [variations, product]);

  const hasMultiple = (variations?.length ?? 0) > 1;
  const shouldShowRows = hasMultiple ? undefined : true; // se <=1, mostriamo sempre

  const [showVars, setShowVars] = useState<boolean>(shouldShowRows ?? false);

  // -------- Filters (Search + Model tags) --------
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    const src = Array.isArray(variations) ? variations : [];
    src.forEach((v) => {
      const m = String(v?.model ?? '').trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [variations]);

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const toggleModel = (m: string) =>
    setSelectedModels((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filteredVariants = useMemo(() => {
    let list = variantRows;
    if (selectedModels.length) {
      const s = new Set(selectedModels.map((m) => String(m).trim()));
      list = list.filter((v) => s.has(String(v.model ?? '').trim()));
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) =>
      (v.sku?.toLowerCase().includes(q)) ||
      (v.name?.toLowerCase().includes(q)) ||
      (v.model?.toLowerCase().includes(q))
    );
  }, [variantRows, selectedModels, query]);

  // Sorting
  const [sortKey, setSortKey] = useState<'sku-asc' | 'price-asc' | 'price-desc'>('sku-asc');
  const getSortPrice = (v: any): number => {
    const pd = getPrice(v?.id as any);
    if (!pd) return Number.POSITIVE_INFINITY;
    const anyPD: any = pd;
    const p = anyPD.price_discount ?? anyPD.net_price ?? anyPD.price ?? anyPD.gross_price;
    const n = Number(p);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };
  const sortedVariants = useMemo(() => {
    const arr = filteredVariants.slice();
    if (selectedModels.length > 0) {
      // align behavior with Quick View when tags are active
      arr.sort((a, b) => String(a.model ?? '').localeCompare(String(b.model ?? ''), undefined, { numeric: true, sensitivity: 'base' }));
    } else if (!isAuthorized || sortKey === 'sku-asc') {
      arr.sort((a, b) => String(a.sku ?? a.id).localeCompare(String(b.sku ?? b.id)));
    } else {
      arr.sort((a, b) => {
        const pa = getSortPrice(a);
        const pb = getSortPrice(b);
        return sortKey === 'price-asc' ? pa - pb : pb - pa;
      });
    }
    return arr;
  }, [filteredVariants, selectedModels, isAuthorized, sortKey]);

  useEffect(() => {
    if (!isAuthorized) return;
    const candidates = new Set<string>();
    const baseSku = String(sku ?? '').trim();
    if (baseSku) candidates.add(baseSku);
    variantRows.forEach((v) => {
      const candidateSku = String(v?.sku ?? baseSku).trim();
      if (candidateSku) candidates.add(candidateSku);
    });
    if (!candidates.size) return;
    reminders.loadBulkStatus(Array.from(candidates)).catch(() => {});
  }, [isAuthorized, reminders, variantRows, sku]);

  /** ---------- RIGA PARENT (stesso grid) ---------- */
  return (
    <div className={cn('border border-gray-200 rounded-md bg-white', className)}>
      <div className="p-2 sm:p-3">
        <div className={cn(GRID_PARENT_3, GRID_COL_DIVIDERS, 'items-start')}>
          {/* 1) Parent image */}
          <Cell>
            <button
              type="button"
              onClick={() => openQuick()}
              className="relative block w-[96px] h-[96px] sm:w-[110px] sm:h-[110px] overflow-hidden rounded-md ring-1 ring-gray-100 mx-auto sm:mx-0"
              title={name ?? parentSku ?? 'Product'}
            >
              <Image
                src={image?.thumbnail && image.thumbnail.trim() !== ''
                  ? image.thumbnail
                  : productPlaceholder}
                alt={name ?? parentSku ?? 'Product'}
                fill
                sizes="140px"
                className="object-cover"
              />

            </button>
          </Cell>

          {/* 2) Parent info (name / parentSku / description) */}
          <Cell>
            <div className="min-w-0">
              {parentSku && (
                <div
                  className="mt-0.5 text-[11px] sm:text-xs text-gray-600 uppercase truncate"
                  title={parentSku}
                >
                  <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-brand px-2 py-2">{parentSku}</span>

                </div>
              )}
              <h3
                className="text-sm sm:text-[15px] font-semibold text-gray-900 truncate uppercase"
                title={name ?? parentSku ?? ''}
              >
                {name ?? parentSku ?? <Dash />}
              </h3>



              {description ? (
                <p className="mt-1 text-xs sm:text-sm text-gray-700 line-clamp-2">
                  {description}
                </p>
              ) : (
                <div className="mt-1 text-xs text-gray-400"><Dash /></div>
              )}
            </div>
          </Cell>

          {/* 3) Brand image (right) - PIM format */}
          <Cell className="hidden sm:flex justify-end items-center">
            {(brand as any)?.logo_url && (brand as any)?.brand_id && (
              <Link
                href={`/${lang}/search?filters-brand_id=${(brand as any).brand_id}`}
                className="block w-[120px] h-[64px]"
                title={brand?.name || 'Brand'}
              >
                <img
                  src={(brand as any).logo_url}
                  alt={brand?.name || 'Brand'}
                  className="w-full h-full object-contain"
                />
              </Link>
            )}
          </Cell>
        </div>
      </div>


      {/* Toggle varianti (solo se > 1) */}
      {hasMultiple && (
        <div className="px-2 sm:px-2 pb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowVars(v => !v)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showVars
              ? t('hide-variants', { defaultValue: 'Hide variants' })
              : t('show-variants', { defaultValue: 'Show variants' })}{' '}
            ({variations.length})
          </button>
        </div>
      )}

      {/* ---------- SEZIONE VARIANTI (tabellare e omogenea) ---------- */}
      {(showVars || shouldShowRows) && (
        <div className="pl-2 sm:pl-3 pb-2 pr-2 divide-y-2 divide-gray-200">
          {/* Filters: always visible by default; can gate via prop if > 0 */}
          {((filterThreshold ?? 0) <= 0) || ((variations?.length ?? 0) >= filterThreshold) ? (
            <VariantsFilterBar
              className="mb-2"
              query={query}
              onQueryChange={setQuery}
              sortKey={sortKey}
              onSortChange={(k) => setSortKey(k as any)}
              modelOptions={modelOptions}
              selectedModels={selectedModels}
              onToggleModel={toggleModel}
              onClearModels={() => setSelectedModels([])}
              isAuthorized={isAuthorized}
              searchPlaceholder={t('search-variants', { defaultValue: 'Search SKU, name, model…' })}
              showSearchAndSort={(variations?.length ?? 0) >= (searchSortThreshold ?? 0)}
            />
          ) : null}
          {sortedVariants.map((v) => {
            const isPseudo = !!(v as any).__pseudo;
            const vPrice: ErpPriceData | undefined = isPseudo ? priceData : getPrice(v.id);
            const vImg = v.image?.thumbnail ?? productPlaceholder;
            const targetSku = String(v.sku ?? sku ?? '').trim();
            const isOutOfStock = vPrice ? Number(vPrice.availability) <= 0 : false;
            const reminderActive = targetSku ? reminders.hasReminder(targetSku) : false;
            const reminderBusy = targetSku ? !!reminderLoading[targetSku] : false;

            return (
              <div key={v.id} className={cn(
                'group relative transition-colors',
                'hover:bg-gray-100 mb-2 sm:mb-0 '
              )}>
                {/* Stesse 5 colonne + divisori verticali per “effetto tabella” */}
                <div className={cn(GRID, GRID_COL_DIVIDERS)}>
                  {/* 1) Immagine variante — align to right, with wishlist toggle above */}
                  <Cell className="!px-0 sm:justify-self-end justify-self-start">

                    {isPseudo ? (
                      <div aria-hidden style={{ width: VARIANT_IMG, height: VARIANT_IMG }} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => openQuick(v)}
                        className="relative overflow-hidden rounded ring-1 ring-gray-100"
                        style={{ width: VARIANT_IMG, height: VARIANT_IMG }}
                        title={v.name ?? v.sku ?? 'Variant'}
                      >
                        <Image
                          src={vImg}
                          alt={v.name ?? v.sku ?? 'Variant'}
                          fill
                          sizes="100px"
                          className="object-cover"
                        />
                      </button>
                    )}
                  </Cell>

                  {/* 2) Info variante: riga 1 SKU+Brand, riga 2 Model */}
                  <Cell>
                    <div className="min-w-0">
                      {isAuthorized ? (
                        <div className="flex flex-col gap-1 text-[12px] text-gray-600 mb-1">
                          {isOutOfStock && targetSku ? (
                            <div className="flex items-center gap-1">
                              <span>{t('text-reminder')}</span>
                              <button
                                type="button"
                                aria-label="Toggle reminder"
                                className={cn(
                                  'p-1 rounded text-[18px] transition-colors',
                                  reminderActive ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                                )}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!targetSku) return;
                                  setReminderLoading((prev) => ({ ...prev, [targetSku]: true }));
                                  try {
                                    await reminders.toggle(targetSku);
                                  } finally {
                                    setReminderLoading((prev) => ({ ...prev, [targetSku]: false }));
                                  }
                                }}
                                disabled={reminderBusy || !targetSku}
                                title={reminderActive ? t('text-reminder-active') : t('text-reminder-notify')}
                              >
                                {reminderActive ? (
                                  <IoNotifications className="animate-pulse" />
                                ) : (
                                  <IoNotificationsOutline />
                                )}
                              </button>
                            </div>
                          ) : null}

                          <div className="flex items-center gap-1">
                            <span>{t('text-wishlist')}</span>
                            <button
                              type="button"
                              aria-label="Toggle wishlist"
                              className={cn(
                                'p-1 rounded text-[18px] transition-colors',
                                likes.isLiked(targetSku) ? 'text-[#6D727F]' : 'text-gray-400 hover:text-brand'
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!targetSku) return;
                                likes.toggle(targetSku);
                              }}
                              title={t('text-wishlist')}
                            >
                              {likes.isLiked(targetSku) ? <IoIosHeart /> : <IoIosHeartEmpty />}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {/* Row: SKU + Brand */}
                      <div className="flex items-center text-xs text-gray-600 whitespace-nowrap gap-1.5 min-w-0">
                        <span className="uppercase">{v.sku ?? sku ?? '-'}</span>
                        {(brand as any)?.brand_id && brand?.name ? (
                          <>
                            <span className="text-gray-300">•</span>
                            <Link
                              href={`/${lang}/search?filters-brand_id=${(brand as any).brand_id}`}
                              className="text-brand hover:underline uppercase truncate max-w-[65%]"
                              title={brand.name}
                            >
                              {brand.name}
                            </Link>
                          </>
                        ) : (
                          ''
                        )}
                      </div>
                      {v.model ? (
                        <div className="text-[13px] text-gray-700 mt-0.5 line-clamp-1">
                          <span className="mr-1">{t('model', { defaultValue: 'model:' })}</span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md border px-2 py-0.5 align-middle',
                              'text-[11px] font-semibold tracking-wide',
                              'bg-brand/10 text-brand-dark border-brand/30'
                            )}
                          >
                            {v.model}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[13px] text-gray-400 mt-0.5">''</div>
                      )}

                      {vPrice?.packaging_option_default && (
                        <div className="text-[13px] text-gray-700 mt-0.5 line-clamp-1">
                          {vPrice
                            && formatAvailability(
                              vPrice.availability,
                              vPrice.packaging_option_default?.packaging_uom
                            )}
                        </div>
                      )}

                    </div>
                  </Cell>

                  {/* 3) Packaging */}
                  <Cell><PackagingGrid pd={vPrice} /></Cell>

                  {/* 4) Ordered */}
                  <Cell>
                    {vPrice?.buy_did ? (
                      <div className="flex flex-col items-start sm:items-center gap-1">
                        <span className="bg-gray-700 text-white px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          {t('ordered', { defaultValue: 'ORDERED' })}
                        </span>
                        <span className="text-xs text-gray-700">{vPrice.buy_did_last_date}</span>
                      </div>
                    ) : (
                      <div className="text-center sm:text-right text-gray-300"></div>
                    )}
                  </Cell>
                  {/* 5) Ordered */}
                  <Cell>

                    {vPrice && (
                      <PriceAndPromo
                        name={name}
                        sku={sku}
                        priceData={vPrice}
                        currency="EUR"
                        withSchemaOrg={true}
                        // className="px-3 py-1 justify-start" // optional tweaks
                        onPromosClick={() => {
                          // open promo modal, or show toast, etc.
                          // openModal('PROMOS_LIST', priceData)
                        }}
                      />
                    )}
                  </Cell>

                  {/* 6)  Add */}
                  <Cell>
                    <div className="flex flex-col justify-center items-end gap-2">
                      {isAuthorized && (
                        <AddToCart product={isPseudo ? (product as any) : v} priceData={vPrice} variant="venus" lang={lang} className='justify-end' />
                      )}
                    </div>
                  </Cell>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
