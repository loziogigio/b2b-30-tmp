import { useTranslation } from 'src/app/i18n/client';
import { FilteredItem } from './filtered-item';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

type Props = {
  lang: string;
  /**
   * Optional whitelist of `filters-<key>` URL params to render. Anything not
   * in the list still renders if `allowedKeys` is `undefined`. We don't gate
   * by default so URL-only filters (e.g. `filters-promo_code`, which has no
   * facet feed) still show as chips when applied.
   */
  allowedKeys?: string[];
  /** `filters-<key> → value → human label` map; falls back to the raw value when missing. */
  labelMap?: Record<string, Record<string, string>>;
};

// Multi-value separators a single facet may use in the URL.
const MULTI_VALUE_SEPARATORS = /[,;]/;

/** Strip the `filters-` prefix and capitalise for the chip's "key" label. */
function prettyKey(filterParam: string): string {
  const key = filterParam.replace(/^filters-/, '');
  return key.replace(/[._]/g, ' ');
}

export default function SelectedFilters({
  lang,
  allowedKeys,
  labelMap,
}: Props) {
  const { t } = useTranslation(lang, 'common');
  const { push } = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // [{ paramKey, value, label }] — one entry per individual filter value, so
  // multi-value params (e.g. brand_id=12,18) render as separate chips.
  const chips = useMemo(() => {
    const out: { paramKey: string; value: string; label: string }[] = [];
    if (!searchParams) return out;
    searchParams.forEach((rawValue, paramKey) => {
      if (!paramKey.startsWith('filters-')) return;
      if (allowedKeys && !allowedKeys.includes(paramKey)) return;
      if (!rawValue) return;
      const values = rawValue.split(MULTI_VALUE_SEPARATORS).filter(Boolean);
      const valueLabels = labelMap?.[paramKey] ?? {};
      for (const value of values) {
        out.push({
          paramKey,
          value,
          label: valueLabels[value] || value,
        });
      }
    });
    return out;
  }, [searchParams, allowedKeys, labelMap]);

  const removeFilterValue = (paramKey: string, valueToRemove: string) => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(paramKey);
    if (!current) return;
    const next = current
      .split(MULTI_VALUE_SEPARATORS)
      .filter((v) => v && v !== valueToRemove)
      .join(',');
    if (next) params.set(paramKey, next);
    else params.delete(paramKey);
    const search = params.toString();
    push(search ? `${pathname}?${search}` : pathname || '/', {
      scroll: false,
    });
  };

  const clearAllFilters = () => {
    if (!searchParams) return;
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (!key.startsWith('filters-')) params.set(key, value);
    });
    const search = params.toString();
    push(search ? `${pathname}?${search}` : pathname || '/', {
      scroll: false,
    });
  };

  if (chips.length === 0) return null;

  return (
    <div className="block mb-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center flex-wrap min-w-0">
          {chips.map((c) => (
            <FilteredItem
              key={`${c.paramKey}:${c.value}`}
              itemKey={prettyKey(c.paramKey)}
              itemValue={c.label}
              onClick={() => removeFilterValue(c.paramKey, c.value)}
            />
          ))}
        </div>
        <button
          type="button"
          className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 hover:underline focus:outline-none transition-colors"
          aria-label={t('text-clear-all')}
          onClick={clearAllFilters}
        >
          {t('text-clear-all')}
        </button>
      </div>
    </div>
  );
}
