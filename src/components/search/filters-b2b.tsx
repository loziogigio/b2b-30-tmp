'use client';

import SelectedFilters from './selected-filters';
import { useTranslation } from 'src/app/i18n/client';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { useFilterQuery } from '@framework/product/get-b2b-filters';
import { FiltersB2BItem } from './filters-b2b-item';

export const SearchFiltersB2B: React.FC<{ lang: string }> = ({ lang }) => {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();

  const urlParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    urlParams[key] = value;
  });

  const mergedParams = {
    ...urlParams,
    address_code: '1',
    customer_code: '19842',
  };

  const {
    data: filters,
    isLoading: isLoadingFilters,
    error: filtersError,
  } = useFilterQuery(mergedParams);

  return (
    <div className="space-y-10">
      {isLoadingFilters && <p>Loading filters...</p>}
      {filtersError && <p>Error loading filters</p>}

      <SelectedFilters lang={lang} />

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

  