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
import { PIM_FACET_FIELDS } from '@framework/utils/filters';
import { useQuery } from '@tanstack/react-query';
import {
  getUserLikes as apiGetUserLikes,
  getTrendingProductsPage as apiGetTrendingPage,
} from '@framework/likes';
import { ProductTypeBreadcrumb } from './product-type-breadcrumb';
import { TechSpecsFilters } from './tech-specs-filters';
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';

export const SearchFiltersB2B: React.FC<{ lang: string; text?: string }> = ({
  lang,
  text,
}) => {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const urlParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    urlParams[key] = value;
  });

  // Check if we're on trending or likes page
  const source = (searchParams.get('source') || '').toLowerCase();
  const period = (searchParams.get('period') || '7d').toLowerCase();
  const isLikesOrTrending = source === 'likes' || source === 'trending';

  // Fetch SKUs for likes/trending pages
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

      if (source === 'trending') {
        // Fetch multiple pages of trending
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await apiGetTrendingPage(
            period,
            page,
            MAX_PAGE_SIZE,
            false,
          );
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
    enabled: isLikesOrTrending,
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
    if (isLikesOrTrending && specialSkus?.length) {
      params['filters-sku'] = specialSkus.join(';');
    }

    return params;
  }, [urlParams, lang, text, isLikesOrTrending, specialSkus]);

  const {
    data: filters,
    isLoading: isLoadingFilters,
    isFetching: isFetchingFilters,
    error: filtersError,
  } = useQuery<PimTransformedFilter[], Error>({
    queryKey: ['pim-filters', mergedParams],
    queryFn: () => fetchPimFilters(mergedParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Don't run facet query until SKUs are loaded (when on trending/likes pages)
    enabled: !isLikesOrTrending || (isLikesOrTrending && !isLoadingSkus),
  });

  // Build label map for selected chips: { 'filters-<key>': { value: label } }
  const labelMap: Record<string, Record<string, string>> = React.useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const f of filters ?? []) {
      const k = `filters-${f.key}`;
      map[k] = {};
      for (const v of f.values ?? [])
        map[k][String(v.value)] = v.label || String(v.value);
    }
    return map;
  }, [filters]);

  const allowedKeys = React.useMemo(() => {
    // Prefer keys from loaded filters (dynamic)
    if (filters && filters.length) {
      return filters.map((f) => `filters-${f.key}`);
    }
    // Fallback to static PIM facet fields
    return PIM_FACET_FIELDS.map((k) => `filters-${k}`);
  }, [filters]);

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
    if (isLikesOrTrending && specialSkus?.length) {
      f['filters-sku'] = specialSkus.join(';');
    }

    return f;
  }, [searchParams, lang, text, isLikesOrTrending, specialSkus]);

  // Filter out product_type_code from main filters when showing as breadcrumb
  const mainFilters = effectiveProductTypeCode
    ? filters?.filter((f) => f.key !== 'product_type_code')
    : filters;

  // Handle clearing product type filter
  const handleClearProductType = React.useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('filters-product_type_code');
    router.push(`${pathname}${url.search}`, { scroll: false });
  }, [pathname, router]);

  return (
    <div className="space-y-3">
      {/* Selected Filters (Clear All) */}
      <SelectedFilters
        lang={lang}
        allowedKeys={allowedKeys}
        labelMap={labelMap}
      />

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
            {/* Product Type Section (when selected or single) */}
            {effectiveProductTypeCode && effectiveProductTypeLabel && (
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

            {/* Tech Specs Section (when product type is active) */}
            {effectiveProductTypeCode && (
              <>
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
                {/* Thicker separator between sections */}
                {mainFilters && mainFilters.length > 0 && (
                  <hr className="border-t-2 border-border-base" />
                )}
              </>
            )}

            {/* Regular Filters Section */}
            {mainFilters?.map((filter, index) => (
              <React.Fragment key={filter.key}>
                <FiltersB2BItem
                  lang={lang}
                  filterKey={filter.key}
                  label={filter.label}
                  values={filter.values}
                  variant="flat"
                  isLoading={isFetchingFilters}
                />
                {index < mainFilters.length - 1 && (
                  <hr className="border-border-base mx-4" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
