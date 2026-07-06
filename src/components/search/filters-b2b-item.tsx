'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { useTranslation } from 'src/app/i18n/client';
import cn from 'classnames';

type FilterValue = {
  value: string;
  label: string;
  count: number;
  logo_url?: string;
  entity?: { logo_url?: string } | null;
};

type FiltersB2BItemProps = {
  lang: string;
  filterKey: string;
  label: string;
  values: FilterValue[];
  uom?: string; // Unit of measure (e.g., "mm", "MT")
  variant?: 'default' | 'nested' | 'flat'; // Styling variant: flat = no borders, compact
  isSpecFilter?: boolean; // For spec filters: use semicolon separator & disable count=0
  isLoading?: boolean; // When true, hide counts for selected items (stale data)
};

export const FiltersB2BItem = ({
  lang,
  filterKey,
  label,
  values,
  uom,
  variant = 'default',
  isSpecFilter = false,
  isLoading = false,
}: FiltersB2BItemProps) => {
  const { t } = useTranslation(lang, 'common');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formState, setFormState] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const queryKey = `filters-${filterKey}`;
  const queryParamValue = searchParams?.get(queryKey);
  const isUserAction = React.useRef(false);

  // Separator: semicolon for specs (values may contain commas), comma for regular filters
  const separator = isSpecFilter ? ';' : ',';

  // Sync URL params to formState on mount and when URL changes
  useEffect(() => {
    if (!isUserAction.current) {
      setFormState(queryParamValue?.split(separator).filter(Boolean) ?? []);
    }
    isUserAction.current = false;
  }, [queryParamValue, separator]);

  // Update URL when user clicks checkbox (not on URL sync)
  const updateUrl = React.useCallback(
    (newFormState: string[]) => {
      const newValue = newFormState.join(separator);
      const params = new URLSearchParams(searchParams?.toString() ?? '');

      if (newValue) {
        params.set(queryKey, newValue);
      } else {
        params.delete(queryKey);
      }

      isUserAction.current = true;
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [queryKey, pathname, router, separator, searchParams],
  );

  function handleItemClick(e: React.FormEvent<HTMLInputElement>): void {
    const { value } = e.currentTarget;
    const newFormState = formState.includes(value)
      ? formState.filter((item) => item !== value)
      : [...formState, value];
    setFormState(newFormState);
    updateUrl(newFormState);
  }

  const visibleCount = 5;

  // General facets HIDE unselected zero-count values — products the customer
  // can't see (channel scope, user-exclusion rules) must not leave dead
  // entries. Selected values stay visible at zero so they can be untoggled.
  // Spec filters keep zero values visible (muted) so the full spec range at
  // the same level stays comparable.
  // Sort: selected first, then by count descending, then by label as tiebreaker.
  const sortedValues = React.useMemo(() => {
    const visible = isSpecFilter
      ? values
      : values.filter((v) => v.count > 0 || formState.includes(v.value));
    return [...visible].sort((a, b) => {
      const aSelected = formState.includes(a.value);
      const bSelected = formState.includes(b.value);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      // Higher count first (pushes count=0 to the bottom)
      if (b.count !== a.count) return b.count - a.count;
      // Tiebreaker: label alphabetically/numerically
      return a.label.localeCompare(b.label, undefined, { numeric: true });
    });
  }, [values, formState, isSpecFilter]);

  const shownValues = expanded
    ? sortedValues
    : sortedValues.slice(0, visibleCount);

  // Flat variant: no borders, compact styling for unified sidebar
  const isFlat = variant === 'flat' || variant === 'nested';
  const containerClasses = isFlat ? '' : 'border rounded-md border-border-base';

  // Compact padding for flat variant
  const headerPadding = isFlat ? 'px-4 py-2' : 'px-5 py-4';
  const contentPadding = isFlat ? 'px-4 pb-2' : 'px-5 pb-3';

  return (
    <div className="block">
      <Disclosure defaultOpen>
        {({ open }) => (
          <div className={containerClasses}>
            <DisclosureButton
              className={cn(
                'w-full flex items-center justify-between',
                headerPadding,
              )}
            >
              <span
                className={cn(
                  'text-brand-dark font-semibold',
                  isFlat ? 'text-sm uppercase' : 'text-base',
                )}
              >
                {label}
              </span>
              {open ? (
                <IoIosArrowUp className="text-brand-dark text-opacity-80 text-sm" />
              ) : (
                <IoIosArrowDown className="text-brand-dark text-opacity-80 text-sm" />
              )}
            </DisclosureButton>
            <DisclosurePanel>
              <div className={cn('flex flex-col', contentPadding)}>
                {shownValues.map((item) => {
                  const isSelected = formState.includes(item.value);
                  // Show muted style for count=0 but don't disable - allow multi-select OR
                  const isZeroCount = item.count === 0 && !isSelected;
                  const logoUrl = item.logo_url || item.entity?.logo_url;

                  return (
                    <label
                      key={`${filterKey}-${item.value}`}
                      className={cn(
                        'group flex items-center justify-between text-sm py-0.5 cursor-pointer transition-all hover:text-opacity-80',
                        isZeroCount ? 'text-gray-400' : 'text-brand-dark',
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          className="appearance-none w-4 h-4 border border-gray-300 rounded bg-white checked:bg-brand checked:border-brand cursor-pointer shrink-0"
                          name={`${filterKey}-${item.value}`}
                          checked={isSelected}
                          value={item.value}
                          onChange={handleItemClick}
                          style={{
                            backgroundImage: isSelected
                              ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                              : 'none',
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                        {logoUrl && (
                          <img
                            src={logoUrl}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded object-contain bg-white"
                            loading="lazy"
                          />
                        )}
                        <span className="text-sm truncate">
                          {item.label}
                          {uom && (
                            <span className="text-brand-muted ml-1">{uom}</span>
                          )}
                        </span>
                      </span>
                      {/* Hide count for zero-count unselected items, and hide during loading for selected items */}
                      {(item.count > 0 || isSelected) &&
                        !(isLoading && isSelected) && (
                          <span className="text-xs text-brand-dark/60">
                            ({item.count})
                          </span>
                        )}
                    </label>
                  );
                })}

                {sortedValues.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setExpanded((s) => !s)}
                    className="flex justify-start items-center w-full pt-1 text-xs font-medium text-brand focus:outline-none"
                  >
                    {expanded ? (
                      <>
                        <span className="inline-block ltr:pr-1 rtl:pl-1">
                          - {t('text-see-less')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-block ltr:pr-1 rtl:pl-1">
                          + {t('text-see-more')}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </div>
  );
};
