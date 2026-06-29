// components/product/b2b-variants-grid-content.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getThemedComponent } from '@/lib/theme/registry';
import { useProductsPriceMap } from '@framework/pricing';
import { useThemeId } from '@/contexts/tenant.context';
import { useCatalogSettings } from '@/hooks/use-catalog-settings';
import { IoGridOutline, IoListOutline } from 'react-icons/io5';

const ThemedProductCard = getThemedComponent('ProductCard');
const ThemedVariantsTable = getThemedComponent('VariantsTable');
import cn from 'classnames';
import Image from '@components/ui/image';
import { productPlaceholder } from '@assets/placeholders';
import Link from 'next/link';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';

type VariantMinimal = {
  id: string | number;
  sku?: string;
  name?: string;
  model?: string;
  [k: string]: any;
};

interface B2BVariantsGridContentProps {
  lang: string;
  /** The parent product with variations array */
  product: any;
  /** When true, uses window/viewport scroll instead of contained scroll div */
  useWindowScroll?: boolean;
  /** Optional callback when brand link is clicked (e.g. close modal) */
  onBrandClick?: () => void;
}

export default function B2BVariantsGridContent({
  lang,
  product,
  useWindowScroll = false,
  onBrandClick,
}: B2BVariantsGridContentProps) {
  const { isAuthorized } = useUI();
  const { t } = useTranslation(lang, 'common');

  // Grid/list view toggle — only the time theme has a themed variant table,
  // so the toggle (and list mode) are gated to it. Each open starts on the
  // channel's `default_view` (catalog_settings, same source as the catalog
  // listing); a manual toggle wins for the rest of the session.
  const themeId = useThemeId();
  const supportsList = themeId === 'time';
  const { settings: catalogSettings } = useCatalogSettings();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const userToggledRef = useRef(false);
  const isList = view === 'list';

  // Apply the channel default once settings resolve (the hook returns the
  // default 'grid' synchronously, then updates), unless the user already chose.
  // List mode only exists in the time theme, so other themes stay on grid.
  useEffect(() => {
    if (userToggledRef.current || !supportsList) return;
    setView(catalogSettings.defaultView === 'list' ? 'list' : 'grid');
  }, [catalogSettings.defaultView, supportsList]);

  const chooseView = (next: 'grid' | 'list') => {
    userToggledRef.current = true;
    setView(next);
  };

  const {
    name,
    image: productImage,
    sku,
    parent_sku,
    brand,
    description,
  } = product ?? {};

  const variants: VariantMinimal[] = Array.isArray(product?.variations)
    ? product.variations
    : [];

  // Filter + sort UI
  const [sortKey, setSortKey] = useState<
    'sku-asc' | 'price-asc' | 'price-desc'
  >('sku-asc');
  const [query, setQuery] = useState('');
  // model tag filter
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => {
      const m = String(v.model ?? '').trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }, [variants]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const toggleModel = (m: string) =>
    setSelectedModels((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    let base = variants;
    if (selectedModels.length) {
      const s = new Set(selectedModels.map((m) => String(m).trim()));
      base = base.filter((v) => s.has(String(v.model ?? '').trim()));
    }
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (v) =>
        v.sku?.toLowerCase().includes(q) ||
        v.name?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q),
    );
  }, [variants, selectedModels, query]);

  // Prices are inline on each variant (variant.price = pricing.list, post-transform).
  // Unpriced variants (status !== 'priced') get +Infinity so they sink to the
  // bottom of price-asc and to the top of price-desc.
  const getSortPrice = (variant: any): number => {
    const list = variant?.pricing?.list;
    const fallback = variant?.price;
    const v = list != null ? Number(list) : Number(fallback);
    return Number.isFinite(v) && v > 0 ? v : Number.POSITIVE_INFINITY;
  };

  const sorted = useMemo(() => {
    const copy = filtered.slice();
    const localeOpts = { numeric: true, sensitivity: 'base' } as const;
    // Primary: model (alphabetical/numeric-aware); secondary: sku — matches
    // the ordering used for the model-filter chips so products line up with them.
    const byModelThenSku = (a: any, b: any) => {
      const cm = String(a.model ?? '').localeCompare(
        String(b.model ?? ''),
        undefined,
        localeOpts,
      );
      if (cm !== 0) return cm;
      return String(a.sku ?? a.id).localeCompare(
        String(b.sku ?? b.id),
        undefined,
        localeOpts,
      );
    };

    if (!isAuthorized || sortKey === 'sku-asc' || selectedModels.length > 0) {
      copy.sort(byModelThenSku);
    } else {
      copy.sort((a, b) => {
        const pa = getSortPrice(a);
        const pb = getSortPrice(b);
        const dir = sortKey === 'price-asc' ? pa - pb : pb - pa;
        if (dir !== 0) return dir;
        return byModelThenSku(a, b);
      });
    }
    return copy;
  }, [filtered, sortKey, isAuthorized, selectedModels]);

  // One batched ERP request for all visible variants. The sentinel {} is passed
  // when a variant has no price yet (batch loading or no ERP price) so individual
  // cards don't fire their own requests.
  const variantPriceMap = useProductsPriceMap(sorted);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const parentSku = parent_sku ?? sku;
  // Parent groups often lack their own image/name/brand/description — fall back
  // to a representative variant so the modal header isn't blank / NO IMAGE.
  const rep: any =
    variants.find(
      (v: any) => v?.name || v?.image?.thumbnail?.trim() || v?.brand?.name,
    ) ??
    variants[0] ??
    null;
  const title = name || rep?.name || parentSku || '';
  const displayImage =
    (productImage?.thumbnail?.trim()
      ? productImage.thumbnail
      : rep?.image?.thumbnail) || productPlaceholder;
  const displayDescription = description || rep?.description || '';
  const displayBrand: any =
    brand?.name && brand?.id !== '0' ? brand : (rep?.brand ?? brand);

  const gridContent = (
    <div
      className={cn(
        'grid gap-2 md:gap-3 2xl:gap-4',
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
      )}
    >
      {sorted.map((v) => (
        <ThemedProductCard
          key={`variant-${String(v.id)}`}
          product={v as any}
          lang={lang}
          className="w-full"
          hideDescription
          priceData={variantPriceMap[String(v.id)] ?? ({} as any)}
        />
      ))}
    </div>
  );

  // List mode reuses the theme's spec-table, fed the same sorted variants +
  // batched prices the grid uses. The shared search/sort/model controls drive
  // both views.
  const listContent = (
    <ThemedVariantsTable
      lang={lang}
      parent={product}
      variants={sorted}
      priceMap={variantPriceMap}
      brand={displayBrand}
      fallbackImg={displayImage}
    />
  );

  const bodyContent = isList && supportsList ? listContent : gridContent;

  return (
    <div
      className={cn(
        'bg-white flex flex-col',
        !useWindowScroll && 'h-full overflow-hidden',
      )}
    >
      {/* Header: parent product info */}
      <div className="border-b px-3 sm:px-4 py-2">
        <div className="flex items-start gap-3 sm:gap-4 pr-12 sm:pr-0">
          <div className="relative shrink-0 w-[56px] h-[56px] sm:w-[80px] sm:h-[80px] rounded overflow-hidden">
            <Image
              src={displayImage}
              alt={title || 'Product Image'}
              fill
              quality={90}
              sizes="(max-width: 768px) 25vw, (max-width: 1200px) 15vw, 10vw"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center text-xs text-gray-500 whitespace-nowrap gap-1.5 min-w-0">
              <span className="uppercase">{sku}</span>

              {displayBrand?.name && displayBrand?.id !== '0' && (
                <>
                  <span className="text-gray-300">&bull;</span>
                  <Link
                    href={`/${lang}/search?filters-brand_id=${displayBrand.id}`}
                    className="text-brand hover:underline uppercase truncate max-w-[55%] sm:max-w-[60%]"
                    title={displayBrand.name}
                    onClick={
                      onBrandClick
                        ? () => setTimeout(() => onBrandClick(), 0)
                        : undefined
                    }
                  >
                    {displayBrand.name}
                  </Link>
                </>
              )}
            </div>

            <h3 className="mt-1 text-sm sm:text-base font-semibold truncate">
              {title}
            </h3>

            {displayDescription ? (
              <p className="mt-0.5 text-xs sm:text-sm text-gray-600 line-clamp-2">
                {displayDescription}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Controls: search, sort, model tags */}
      <div className="border-b px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              aria-label="Filter variants"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by SKU, name, model…"
              className="h-10 sm:h-11 w-full rounded-md border px-3 pr-10 text-sm bg-white border-gray-300 placeholder-gray-500 focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                title="Clear"
              >
                &times;
              </button>
            )}
          </div>
          <div className="shrink-0 ml-auto flex items-center gap-2">
            {isAuthorized && (
              <select
                aria-label={t('sort-variants-aria')}
                value={sortKey}
                onChange={(e) =>
                  setSortKey(
                    e.target.value as 'sku-asc' | 'price-asc' | 'price-desc',
                  )
                }
                className="h-10 sm:h-11 rounded-md border px-2 text-sm bg-white border-gray-300"
              >
                <option value="sku-asc">{t('sort-sku-asc')}</option>
                <option value="price-asc">{t('sort-price-asc')}</option>
                <option value="price-desc">{t('sort-price-desc')}</option>
              </select>
            )}
            {supportsList && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => chooseView('grid')}
                  className={cn(
                    'h-10 sm:h-11 w-10 flex items-center justify-center rounded-md border',
                    !isList
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                  )}
                  aria-label={t('grid', { defaultValue: 'Grid' })}
                  aria-pressed={!isList}
                  title={t('grid', { defaultValue: 'Grid' })}
                >
                  <IoGridOutline />
                </button>
                <button
                  type="button"
                  onClick={() => chooseView('list')}
                  className={cn(
                    'h-10 sm:h-11 w-10 flex items-center justify-center rounded-md border',
                    isList
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                  )}
                  aria-label={t('list', { defaultValue: 'List' })}
                  aria-pressed={isList}
                  title={t('list', { defaultValue: 'List' })}
                >
                  <IoListOutline />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {modelOptions.map((m) => (
            <button
              key={`mdl-${m}`}
              type="button"
              className={cn(
                'px-2 py-1 rounded-md border text-xs font-medium transition-colors',
                selectedModels.includes(m)
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400',
              )}
              onClick={() => toggleModel(m)}
            >
              {m}
            </button>
          ))}

          {selectedModels.length > 0 && (
            <button
              type="button"
              className="ml-1 px-2 py-1 rounded-md border text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => setSelectedModels([])}
            >
              {t('text-clear-all', { defaultValue: 'Clear all' })}
            </button>
          )}
        </div>
      </div>

      {/* Grid area */}
      {useWindowScroll ? (
        <div className="px-2 sm:px-3 pb-4 pt-3 bg-brand-light">
          {bodyContent}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 pb-4 pt-3 bg-brand-light"
        >
          {bodyContent}
        </div>
      )}
    </div>
  );
}
