import Heading from '@components/ui/heading';
import { useTranslation } from 'src/app/i18n/client';
import { FilteredItem } from './filtered-item';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import isEmpty from 'lodash/isEmpty';
import { useEffect, useState } from 'react';
import useQueryParam from '@utils/use-query-params';

type Props = {
  lang: string;
  allowedKeys?: string[]; // e.g., ['filters-promo_type', 'filters-brand_id']
  labelMap?: Record<string, Record<string, string>>; // key -> (value -> label)
};

export default function SelectedFilters({
  lang,
  allowedKeys,
  labelMap,
}: Props) {
  // Temporarily hidden - filter chips disabled
  return null;

  const { t } = useTranslation(lang, 'common');

  const { push } = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { clearQueryParam, updateQueryparams } = useQueryParam(pathname ?? '/');
  const [state, setState] = useState({});

  useEffect(() => {
    const next: Record<string, string | string[]> = {};
    searchParams?.forEach((value, key) => {
      // Only include whitelisted facet keys if provided
      if (allowedKeys && !allowedKeys.includes(key)) return;
      if (value.includes(',')) next[key] = value.split(',');
      else next[key] = value;
    });
    setState(next);
  }, [searchParams, allowedKeys]);

  function handleArrayUpdate(key: string, item: string) {
    let o = searchParams?.get(key)?.split(',');
    if (o?.includes(item)) {
      updateQueryparams(key, o.filter((i) => i !== item).join(','));
    }
  }
  return (
    <>
      {!isEmpty(searchParams?.toString()) && (
        <div className="block -mb-3">
          <div className="flex items-center justify-between mb-4 -mt-1">
            <Heading>{t('text-filters')}</Heading>
            {/* @ts-ignore */}
            <button
              className="flex-shrink transition duration-150 ease-in text-13px focus:outline-none hover:text-brand-dark"
              aria-label={t('text-clear-all')}
              onClick={() => {
                push(pathname);
              }}
            >
              {t('text-clear-all')}
            </button>
          </div>
          <div className="flex flex-wrap -m-1">
            {Object.entries(state).map(([key, value]) => {
              if (Array.isArray(value)) {
                return value.map((item) => (
                  <FilteredItem
                    itemKey={key ? key : ' '}
                    key={`${key}-${item}`}
                    itemValue={labelMap?.[key]?.[String(item)] ?? (item as any)}
                    onClick={() => handleArrayUpdate(key, item)}
                  />
                ));
              } else {
                return (
                  <FilteredItem
                    itemKey={key ? key : ' '}
                    key={`${key}-${value}`}
                    itemValue={
                      labelMap?.[key]?.[String(value)] ?? (value as any)
                    }
                    onClick={() => {
                      clearQueryParam([key]);
                    }}
                  />
                );
              }
            })}
          </div>
        </div>
      )}
    </>
  );
}
