'use client';

import SelectedFilters from './selected-filters';
import { useTranslation } from 'src/app/i18n/client';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { usePimFilterQuery } from '@framework/product/get-pim-filters';
import { FiltersB2BItem } from './filters-b2b-item';
import { PIM_FACET_FIELDS } from '@framework/utils/filters';

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

  const mergedParams = {
    ...urlParams,
    lang,
    ...(text ? { text } : {}),
  };

  const {
    data: filters,
    isLoading: isLoadingFilters,
    error: filtersError,
  } = usePimFilterQuery(mergedParams);

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
