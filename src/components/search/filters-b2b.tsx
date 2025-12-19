'use client';

import SelectedFilters from './selected-filters';
import { useTranslation } from 'src/app/i18n/client';
import { useSearchParams } from 'next/navigation';
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

export const SearchFiltersB2B: React.FC<{ lang: string; text?: string }> = ({
  lang,
  text,
}) => {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();

  const urlParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    urlParams[key] = value;
  });

  // Check if we're on trending or likes page
  const source = (searchParams.get('source') || '').toLowerCase();
  const period = (searchParams.get('period') || '7d').toLowerCase();
  const pageSizeParam = Math.min(
    100,
    Math.max(1, Number(searchParams.get('page_size') || 24)),
  );
  const isLikesOrTrending = source === 'likes' || source === 'trending';

  // Fetch SKUs for likes/trending pages
  const {
    data: specialSkus,
    isLoading: isLoadingSkus,
    error: skusError,
  } = useQuery({
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
          const res = await apiGetTrendingPage(period, page, MAX_PAGE_SIZE, false);
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

  return (
    <div className="space-y-4">
      {isLoadingFilters && <p>{t('loading-filters')}</p>}
      {filtersError && <p>{t('error-loading-filters')}</p>}

      <SelectedFilters
        lang={lang}
        allowedKeys={allowedKeys}
        labelMap={labelMap}
      />

      {filters?.map((filter) => (
        <FiltersB2BItem
          key={filter.key}
          lang={lang}
          filterKey={filter.key}
          label={filter.label}
          values={filter.values}
        />
      ))}

      {/* Future components */}
      {/* <SelectedFilters lang={lang} />
      <CategoryFilter lang={lang} />
      <DietaryFilter lang={lang} />
      <BrandFilter lang={lang} /> */}
    </div>
  );
};
