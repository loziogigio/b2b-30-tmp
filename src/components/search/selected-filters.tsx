import Heading from '@components/ui/heading';
import { useTranslation } from 'src/app/i18n/client';
import { FilteredItem } from './filtered-item';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import isEmpty from 'lodash/isEmpty';
import { useEffect, useState, useMemo } from 'react';
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
  // Check if there are any filter params (excluding non-filter params like 'view', 'source', 'period', 'page_size', 'text', 'q')
  const hasFilters = useMemo(() => {
    let hasFilterParam = false;
    searchParams?.forEach((_, key) => {
      if (key.startsWith('filters-')) {
        hasFilterParam = true;
      }
    });
    return hasFilterParam;
  }, [searchParams]);

  return (
    <>
      {hasFilters && (
        <div className="block mb-4">
          <div className="flex items-center justify-end">
            {/* @ts-ignore */}
            <button
              className="flex-shrink transition duration-150 ease-in text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none hover:underline"
              aria-label={t('text-clear-all')}
              onClick={() => {
                // Clear all filter params while preserving source, period, page_size, view, etc.
                const params = new URLSearchParams();
                searchParams?.forEach((value, key) => {
                  if (!key.startsWith('filters-')) {
                    params.set(key, value);
                  }
                });
                const search = params.toString();
                push(search ? `${pathname}?${search}` : pathname);
              }}
            >
              {t('text-clear-all')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
