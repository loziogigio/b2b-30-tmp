'use client';

import SelectedFilters from './selected-filters';
import { useTranslation } from 'src/app/i18n/client';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import React from 'react';
import {
  fetchPimFilters,
  type PimTransformedFilter,
} from '@framework/product/get-pim-filters';
import { FiltersB2BItem } from './filters-b2b-item';
import { useQuery } from '@tanstack/react-query';
import {
  getUserLikes as apiGetUserLikes,
  getTrendingProductsPage as apiGetTrendingPage,
} from '@framework/likes';
import { getUserReminders as apiGetUserReminders } from '@framework/reminders';
import { ProductTypeBreadcrumb } from './product-type-breadcrumb';
import { GroupsNavigator, GroupsBreadcrumb } from './groups-navigator';
import { CategoryNavigator } from './category-navigator';
import { TechSpecsFilters } from './tech-specs-filters';
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { orderFacets } from '@/components/search/facet-order';
import { useHomeSettings } from '@/hooks/use-home-settings';

export const SearchFiltersB2B: React.FC<{
  lang: string;
  text?: string;
  /**
   * When true, facets load even with no text and no filters applied — the
   * sidebar reflects the full catalog facet counts. Used by the time theme
   * where the search page is browsable from a blank state. Defaults to
   * false so the existing default-theme behavior (gated facet load) stays.
   */
  allowBlankSearch?: boolean;
}> = ({ lang, text, allowBlankSearch = false }) => {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { settings: homeSettings } = useHomeSettings();
  const facetConfig = homeSettings?.facetConfig;

  const urlParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    urlParams[key] = value;
  });

  // Check if we're on trending, likes, or reminders page
  const source = (searchParams.get('source') || '').toLowerCase();
  const period = (searchParams.get('period') || '7d').toLowerCase();
  const isSpecialSource =
    source === 'likes' || source === 'trending' || source === 'reminders';

  // Blank search: no text, no filters, no special source — new empty tab.
  // When `allowBlankSearch` is true (time theme), we never short-circuit so
  // the sidebar shows full-catalog facet counts even with nothing typed.
  const hasFilters = Object.keys(urlParams).some((k) =>
    k.startsWith('filters-'),
  );
  const isBlankSearch =
    !allowBlankSearch &&
    !isSpecialSource &&
    !text &&
    !urlParams.text &&
    !urlParams.q &&
    !hasFilters;

  // Fetch SKUs for likes/trending/reminders pages
  const { data: specialSkus, isLoading: isLoadingSkus } = useQuery({
    queryKey: ['facet-skus', source, period],
    queryFn: async () => {
      const MAX_PAGE_SIZE = 100; // API limit
      const MAX_PAGES = 5; // Fetch up to 500 SKUs total for faceting
      const allSkus: string[] = [];

      if (source === 'likes') {
        // Fetch multiple pages of likes
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await apiGetUserLikes(page, MAX_PAGE_SIZE);
          const skus = (res?.likes || [])
            .map((l: any) => l.sku)
            .filter(Boolean);
          allSkus.push(...skus);
          if (!res?.has_next) break;
        }
        return allSkus;
      }

      if (source === 'reminders') {
        // Fetch multiple pages of reminders
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await apiGetUserReminders(page, MAX_PAGE_SIZE);
          const skus = (res?.reminders || [])
            .map((r: any) => r.sku)
            .filter(Boolean);
          allSkus.push(...skus);
          if (!res?.has_next) break;
        }
        return allSkus;
      }

      if (source === 'trending') {
        // Fetch multiple pages of trending
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await apiGetTrendingPage(period, page, MAX_PAGE_SIZE);
          const skus = (res?.items || [])
            .map((x: any) => x.sku)
            .filter(Boolean);
          allSkus.push(...skus);
          if (!res?.has_next) break;
        }
        return allSkus;
      }

      return [];
    },
    enabled: isSpecialSource,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Build merged params - same logic as product search
  const mergedParams = React.useMemo(() => {
    const params: Record<string, any> = {
      ...urlParams,
      lang,
      ...(text ? { text } : {}),
    };

    // Add SKU filter for trending/likes pages (same as product search)
    if (isSpecialSource && specialSkus?.length) {
      params['filters-sku'] = specialSkus.join(';');
    }

    return params;
  }, [urlParams, lang, text, isSpecialSource, specialSkus]);

  const {
    data: filters,
    isLoading: isLoadingFilters,
    isFetching: isFetchingFilters,
    error: filtersError,
  } = useQuery<PimTransformedFilter[], Error>({
    queryKey: ['pim-filters', mergedParams],
    queryFn: () => fetchPimFilters(mergedParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Don't run facet query when blank search or until SKUs are loaded for special sources
    enabled:
      !isBlankSearch &&
      (!isSpecialSource || (isSpecialSource && !isLoadingSkus)),
  });

  // Sticky label map for selected chips: { 'filters-<key>': { value: label } }.
  // Once a friendly label has been seen for a code (e.g. promo_type=ZZZ →
  // "GIORNALINO SUPERPREZZI") we keep it across renders. Otherwise narrowing
  // the search until the bucket disappears would regress the chip back to
  // the raw code.
  const [stickyLabelMap, setStickyLabelMap] = React.useState<
    Record<string, Record<string, string>>
  >({});
  React.useEffect(() => {
    if (!filters || filters.length === 0) return;
    setStickyLabelMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const f of filters) {
        const k = `filters-${f.key}`;
        const current = next[k] || {};
        let bucketChanged = false;
        for (const v of f.values ?? []) {
          const value = String(v.value);
          const label = v.label || value;
          if (current[value] !== label) {
            current[value] = label;
            bucketChanged = true;
          }
        }
        if (bucketChanged) {
          next[k] = current;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [filters]);
  const labelMap = stickyLabelMap;

  // Get selected product type code from URL
  const selectedProductTypeCode = searchParams.get('filters-product_type_code');

  // Find product type facet from filters (now using product_type_code)
  const productTypeFacet = filters?.find((f) => f.key === 'product_type_code');

  // Check if only one product type exists (auto-expand case)
  const singleProductType =
    productTypeFacet?.values.length === 1 ? productTypeFacet.values[0] : null;

  // Effective product type code: explicit selection OR auto-detected single
  const effectiveProductTypeCode =
    selectedProductTypeCode || singleProductType?.value;

  // Find the label for the selected product type
  const effectiveProductTypeLabel = React.useMemo(() => {
    if (!effectiveProductTypeCode || !productTypeFacet) return null;
    const matchingValue = productTypeFacet.values.find(
      (v) => v.value === effectiveProductTypeCode,
    );
    return matchingValue?.label || null;
  }, [effectiveProductTypeCode, productTypeFacet]);

  // Build current filters for tech specs query (must match main search logic)
  const currentFilters = React.useMemo(() => {
    const f: Record<string, any> = { lang };
    if (text) f.text = text;

    // Copy all filters- params except product_type_code
    searchParams.forEach((value, key) => {
      if (key.startsWith('filters-') && key !== 'filters-product_type_code') {
        f[key] = value;
      }
    });

    // Add SKU filter for trending/likes pages (same as main search)
    if (isSpecialSource && specialSkus?.length) {
      f['filters-sku'] = specialSkus.join(';');
    }

    return f;
  }, [searchParams, lang, text, isSpecialSource, specialSkus]);

  // Keep all facets (including product_type_code) in the list — the sidebar
  // render anchors the TIPO PRODOTTO breadcrumb + technical-specs accordion to
  // the product_type_code entry, swapping the flat list for the breadcrumb when
  // a type is selected. (Previously this stripped product_type_code; that no
  // longer works now that ordering/anchoring is config-driven.)
  const mainFilters = filters;

  // Handle clearing product type filter
  const handleClearProductType = React.useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('filters-product_type_code');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <div className="space-y-3">
      {/* Groups breadcrumb path */}
      <GroupsBreadcrumb lang={lang} />

      {/* Selected Filters chips + Clear All. We deliberately don't pass
          `allowedKeys` so URL-only filters (e.g. filters-promo_code) chip
          up too — `labelMap` still resolves human labels for known facets. */}
      <SelectedFilters lang={lang} labelMap={labelMap} />

      {/* Unified Filter Container */}
      <div className="border rounded-md border-border-base bg-white">
        {isLoadingFilters ? (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-100 rounded w-full" />
                    <div className="h-2 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filtersError ? (
          <div className="p-4 text-sm text-red-500">
            {t('error-loading-filters')}
          </div>
        ) : (
          /* Single scrollable area for ALL filters */
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {/* Groups Navigator - hierarchical menu tree (hidden on blank search) */}
            {!isBlankSearch && (
              <>
                <GroupsNavigator lang={lang} text={text} />
                <hr className="border-border-base mx-4" />
              </>
            )}

            {/*
              Sidebar render order (matches dfl-b2b reference):
                1. PROMOZIONE       (promo_type)
                2. NOVITÀ           (attribute_is_new_b)
                3. MARCA            (brand_id) + any other header facet
                4. CATEGORIA cascade (category_ancestors)
                5. TIPO PRODOTTO    (product_type_code) — list or breadcrumb
                6. SPECIFICHE TECNICHE accordion (when narrowed)
                7. Tail / boolean facets (stock_status)
            */}
            {(() => {
              // Filters intentionally hidden from the sidebar UI.
              // `has_active_promo` is redundant once `promo_type` is shown
              // (the typed list filters more precisely than a Sì/No flag).
              const HIDDEN_KEYS = new Set(['has_active_promo']);
              // Boolean facets become uninformative when only one bucket
              // exists ("Novità: Sì (X)" doesn't narrow anything if every
              // product carries the flag) — hide them in that case.
              const SINGLE_VALUE_BOOLEAN_FACETS = new Set([
                'has_active_promo',
                'attribute_is_new_b',
              ]);
              // Boolean facets we only want to expose as a single "Sì" toggle
              // — the "No" bucket is just "every other product" and adds noise.
              // The facet still narrows results when checked.
              const TRUE_ONLY_BOOLEAN_FACETS = new Set(['attribute_is_new_b']);
              const isTruthy = (v: string) => v === 'true' || v === '1';

              const filters = (mainFilters || [])
                .filter((f) => {
                  if (HIDDEN_KEYS.has(f.key)) return false;
                  if (
                    SINGLE_VALUE_BOOLEAN_FACETS.has(f.key) &&
                    Array.isArray(f.values) &&
                    f.values.length <= 1
                  ) {
                    return false;
                  }
                  return true;
                })
                .map((f) => {
                  if (
                    TRUE_ONLY_BOOLEAN_FACETS.has(f.key) &&
                    Array.isArray(f.values)
                  ) {
                    const trueOnly = f.values.filter((v: any) =>
                      isTruthy(String(v?.value)),
                    );
                    return { ...f, values: trueOnly };
                  }
                  return f;
                })
                // Drop facets that ended up empty after the value-level filter.
                .filter((f) => !Array.isArray(f.values) || f.values.length > 0);

              // Config-driven ordering: per-portal facet_config decides which
              // facets show and in what order, falling back to the default
              // order/hidden set when there's no config. Value-level smarts
              // above (hidden/single-value/true-only) still apply on top.
              const ordered = orderFacets(filters as any, facetConfig);

              const renderFilter = (filter: any, withDivider = true) => (
                <React.Fragment key={filter.key}>
                  <FiltersB2BItem
                    lang={lang}
                    filterKey={filter.key}
                    label={filter.label}
                    values={filter.values}
                    variant="flat"
                    isLoading={isFetchingFilters}
                  />
                  {withDivider && <hr className="border-border-base mx-4" />}
                </React.Fragment>
              );

              return (
                <>
                  {ordered.map((filter, i) => {
                    const last = i === ordered.length - 1;

                    // CATEGORIA — drill-down navigator
                    if (filter.key === 'category_ancestors') {
                      return (
                        <React.Fragment key={filter.key}>
                          <CategoryNavigator
                            lang={lang}
                            label={filter.label}
                            values={filter.values}
                          />
                          <hr className="border-border-base mx-4" />
                        </React.Fragment>
                      );
                    }

                    // TIPO PRODOTTO — list OR breadcrumb, plus the technical-specs
                    // accordion anchored right after it when a type is selected.
                    if (filter.key === 'product_type_code') {
                      return (
                        <React.Fragment key={filter.key}>
                          {!effectiveProductTypeCode && renderFilter(filter)}

                          {effectiveProductTypeCode &&
                            effectiveProductTypeLabel && (
                              <>
                                <ProductTypeBreadcrumb
                                  lang={lang}
                                  productType={effectiveProductTypeCode}
                                  label={effectiveProductTypeLabel}
                                  onClear={handleClearProductType}
                                />
                                <hr className="border-border-base mx-4" />
                              </>
                            )}

                          {effectiveProductTypeCode && (
                            <>
                              {/* SPECIFICHE TECNICHE accordion */}
                              <div className="block">
                                <Disclosure defaultOpen>
                                  {({ open }) => (
                                    <div>
                                      <DisclosureButton className="w-full flex items-center justify-between px-4 py-2">
                                        <span className="text-brand-dark font-semibold text-sm uppercase">
                                          {t('text-technical-specs')}
                                        </span>
                                        {open ? (
                                          <IoIosArrowUp className="text-brand-dark text-opacity-80 text-sm" />
                                        ) : (
                                          <IoIosArrowDown className="text-brand-dark text-opacity-80 text-sm" />
                                        )}
                                      </DisclosureButton>
                                      <DisclosurePanel>
                                        <TechSpecsFilters
                                          lang={lang}
                                          productType={effectiveProductTypeCode}
                                          currentFilters={currentFilters}
                                        />
                                      </DisclosurePanel>
                                    </div>
                                  )}
                                </Disclosure>
                              </div>
                              {!last && (
                                <hr className="border-t-2 border-border-base" />
                              )}
                            </>
                          )}
                        </React.Fragment>
                      );
                    }

                    // Flat facets (PROMOZIONE, NOVITÀ, MARCA, DISPONIBILITÀ, …)
                    return renderFilter(filter, !last);
                  })}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
