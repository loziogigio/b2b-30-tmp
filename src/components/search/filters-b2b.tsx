'use client';

import SelectedFilters from './selected-filters';
import { useTranslation } from 'src/app/i18n/client';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { useFilterQuery } from '@framework/product/get-b2b-filters';
import { FiltersB2BItem } from './filters-b2b-item';
import { ERP_STATIC } from '@framework/utils/static';
import { FACET_FIELDS } from '@framework/utils/filters';

export const SearchFiltersB2B: React.FC<{ lang: string; text?: string }> = ({ lang, text }) => {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();

  const urlParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    urlParams[key] = value;
  });

  const mergedParams = {
    ...urlParams,
    ...(text ? { text } : {}),
    ...ERP_STATIC
  };

  const {
    data: filters,
    isLoading: isLoadingFilters,
    error: filtersError,
  } = useFilterQuery(mergedParams);

  // Build label map for selected chips: { 'filters-<key>': { value: label } }
  const labelMap: Record<string, Record<string, string>> = React.useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const f of filters ?? []) {
      const k = `filters-${f.key}`;
      map[k] = {};
      for (const v of f.values ?? []) map[k][String(v.value)] = v.label || String(v.value);
    }
    return map;
  }, [filters]);

  const allowedKeys = React.useMemo(() => {
    // Prefer keys from loaded filters (dynamic, includes family/categories etc.)
    if (filters && filters.length) {
      return filters.map((f) => `filters-${f.key}`);
    }
    // Fallback to static facet fields
    return FACET_FIELDS.map((k) => `filters-${k}`);
  }, [filters]);

  return (
    <div className="space-y-4">
      {isLoadingFilters && <p>Loading filters...</p>}
      {filtersError && <p>Error loading filters</p>}

      <SelectedFilters lang={lang} allowedKeys={allowedKeys} labelMap={labelMap} />

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

  
