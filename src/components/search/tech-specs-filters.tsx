'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPimFilters,
  type PimTransformedFilter,
} from '@framework/product/get-pim-filters';
import { FiltersB2BItem } from './filters-b2b-item';
import {
  API_ENDPOINTS_PIM,
  PIM_API_BASE_URL,
} from '@framework/utils/api-endpoints-pim';
import { useTranslation } from 'src/app/i18n/client';

interface Props {
  lang: string;
  productType: string; // This is now the product type code directly
  currentFilters: Record<string, any>;
}

interface SpecUom {
  symbol: string; // e.g., "mm", "MT"
  name: string; // e.g., "millimetri", "MT"
  category: string; // e.g., "length", "other"
}

interface AvailableSpec {
  key: string;
  field: string;
  type: string;
  label: string;
  uom?: SpecUom; // Unit of measure object
  sample_values?: string[];
}

interface AvailableSpecsResponse {
  specs: AvailableSpec[];
  total_products_checked: number;
  product_type_id: string | null;
}

// Fetch available spec fields dynamically from the API
async function fetchAvailableSpecs(
  productTypeCode: string,
): Promise<AvailableSpec[]> {
  if (!productTypeCode) {
    return [];
  }

  const url = new URL(
    `${PIM_API_BASE_URL}${API_ENDPOINTS_PIM.AVAILABLE_SPECS}`,
  );
  url.searchParams.set('product_type_code', productTypeCode);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_ID || '',
      'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET || '',
    },
  });

  if (!response.ok) return [];

  const data: AvailableSpecsResponse = await response.json();
  return data.specs || [];
}

export const TechSpecsFilters = ({
  lang,
  productType,
  currentFilters,
}: Props) => {
  const { t } = useTranslation(lang, 'common');

  // Step 1: Discover available spec fields for this product type dynamically
  const { data: availableSpecs, isLoading: isLoadingSpecs } = useQuery<
    AvailableSpec[]
  >({
    queryKey: ['available-specs', productType],
    queryFn: () => fetchAvailableSpecs(productType),
    enabled: !!productType,
    staleTime: 10 * 60 * 1000, // 10 minutes - specs don't change often
  });

  // Extract field names from available specs
  const specFields = React.useMemo(() => {
    return availableSpecs?.map((s) => s.field) || [];
  }, [availableSpecs]);

  // Build a label map from available specs (API provides labels)
  const specLabelMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    availableSpecs?.forEach((spec) => {
      map[spec.field] = spec.label;
    });
    return map;
  }, [availableSpecs]);

  // Build UOM map from available specs (extract symbol from uom object)
  const specUomMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    availableSpecs?.forEach((spec) => {
      if (spec.uom?.symbol) {
        map[spec.field] = spec.uom.symbol;
      }
    });
    return map;
  }, [availableSpecs]);

  // Build params for tech specs facet query
  const specParams = React.useMemo(() => {
    if (!specFields.length) return null;
    return {
      ...currentFilters,
      lang,
      facet_fields: specFields,
      'filters-product_type_code': productType,
    };
  }, [currentFilters, lang, productType, specFields]);

  // Build params for baseline query (no spec filters - to get all possible values)
  const baselineParams = React.useMemo(() => {
    if (!specFields.length) return null;
    // Exclude spec filters to get ALL possible values for this product type
    const params: Record<string, any> = { lang, facet_fields: specFields };
    params['filters-product_type_code'] = productType;
    // Include text search and non-spec filters
    if (currentFilters.text) params.text = currentFilters.text;
    if (currentFilters['filters-sku'])
      params['filters-sku'] = currentFilters['filters-sku'];
    return params;
  }, [lang, productType, specFields, currentFilters]);

  // Step 2a: Fetch baseline spec values (without spec filters)
  const { data: baselineFilters, isLoading: isLoadingBaseline } = useQuery<
    PimTransformedFilter[]
  >({
    queryKey: ['tech-spec-baseline', productType, baselineParams],
    queryFn: () => fetchPimFilters(baselineParams!),
    enabled: !!productType && !!baselineParams && specFields.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - baseline values are stable
  });

  // Step 2b: Fetch spec facets with current filters applied (for accurate counts)
  const {
    data: currentFiltersData,
    isLoading: isLoadingFilters,
    isFetching: isFetchingFilters,
  } = useQuery<PimTransformedFilter[]>({
    queryKey: ['tech-spec-filters', productType, specParams],
    queryFn: () => fetchPimFilters(specParams!),
    enabled: !!productType && !!specParams && specFields.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Merge baseline values with current counts
  // - Keep ALL values from baseline
  // - Update counts from current response
  // - Values not in current response get count=0
  const specFilters = React.useMemo(() => {
    if (!baselineFilters) return currentFiltersData || [];
    if (!currentFiltersData) return baselineFilters;

    // Build a map of current counts by filter key and value
    const currentCountsMap: Record<string, Record<string, number>> = {};
    currentFiltersData.forEach((filter) => {
      currentCountsMap[filter.key] = {};
      filter.values.forEach((v) => {
        currentCountsMap[filter.key][v.value] = v.count;
      });
    });

    // Merge: keep baseline structure, update counts
    return baselineFilters.map((baseFilter) => {
      const currentCounts = currentCountsMap[baseFilter.key] || {};
      return {
        ...baseFilter,
        values: baseFilter.values.map((v) => ({
          ...v,
          count: currentCounts[v.value] ?? 0, // Use current count or 0
        })),
      };
    });
  }, [baselineFilters, currentFiltersData]);

  const isLoading = isLoadingSpecs || isLoadingBaseline || isLoadingFilters;

  // Loading skeleton - compact version for unified sidebar
  if (isLoading) {
    return (
      <>
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse px-4 py-2">
            <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
            <div className="space-y-1">
              <div className="h-2 bg-gray-100 rounded w-full" />
              <div className="h-2 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        ))}
      </>
    );
  }

  // No specs available
  if (!specFilters?.length) return null;

  // Render just the filter items (wrapper is provided by parent)
  return (
    <>
      {specFilters.map((filter, index) => (
        <React.Fragment key={filter.key}>
          <FiltersB2BItem
            lang={lang}
            filterKey={filter.key}
            label={specLabelMap[filter.key] || filter.label}
            values={filter.values}
            uom={specUomMap[filter.key]}
            variant="flat"
            isSpecFilter
            isLoading={isFetchingFilters}
          />
          {index < specFilters.length - 1 && (
            <hr className="border-border-base mx-4" />
          )}
        </React.Fragment>
      ))}
    </>
  );
};
