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

type FilterValue = {
  value: string;
  label: string;
  count: number;
};

type FiltersB2BItemProps = {
  lang: string;
  filterKey: string;
  label: string;
  values: FilterValue[];
};

export const FiltersB2BItem = ({
  lang,
  filterKey,
  label,
  values,
}: FiltersB2BItemProps) => {
  const { t } = useTranslation(lang, 'common');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formState, setFormState] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const queryKey = `filters-${filterKey}`;
  const queryParamValue = searchParams?.get(queryKey);
  const isInitialMount = React.useRef(true);

  // Sync URL params to formState on mount and when URL changes
  useEffect(() => {
    setFormState(queryParamValue?.split(',').filter(Boolean) ?? []);
  }, [queryParamValue]);

  // Update URL when formState changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const newValue = formState.join(',');
    const url = new URL(location.href);

    if (newValue) {
      url.searchParams.set(queryKey, newValue);
    } else {
      url.searchParams.delete(queryKey);
    }

    router.push(`${pathname}${url.search}`, { scroll: false });
  }, [formState, queryKey, pathname, router]);

  function handleItemClick(e: React.FormEvent<HTMLInputElement>): void {
    const { value } = e.currentTarget;
    setFormState(
      formState.includes(value)
        ? formState.filter((item) => item !== value)
        : [...formState, value],
    );
  }

  const visibleCount = 5;
  const shownValues = expanded ? values : values.slice(0, visibleCount);

  return (
    <div className="block">
      <Disclosure defaultOpen>
        {({ open }) => (
          <div className="border rounded-md border-border-base">
            <DisclosureButton className="w-full flex items-center justify-between px-5 py-4">
              <span className="text-brand-dark text-base font-semibold">
                {label}
              </span>
              {open ? (
                <IoIosArrowUp className="text-brand-dark text-opacity-80 text-lg" />
              ) : (
                <IoIosArrowDown className="text-brand-dark text-opacity-80 text-lg" />
              )}
            </DisclosureButton>
            <DisclosurePanel>
              <div className="flex flex-col px-5 pb-3">
                {shownValues.map((item) => (
                  <label
                    key={`${filterKey}-${item.value}`}
                    className="group flex items-center justify-between text-brand-dark text-sm md:text-15px cursor-pointer transition-all hover:text-opacity-80 py-1"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="form-checkbox text-yellow-100 w-[18px] h-[18px] border-2 border-border-four rounded-sm cursor-pointer transition duration-300 ease-in-out focus:ring-0 focus:outline-none checked:bg-yellow-100"
                        name={`${filterKey}-${item.value}`}
                        checked={formState.includes(item.value)}
                        value={item.value}
                        onChange={handleItemClick}
                      />
                      <span>{item.label}</span>
                    </span>
                    <span className="text-13px text-brand-dark/70">
                      {item.count}
                    </span>
                  </label>
                ))}

                {values.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setExpanded((s) => !s)}
                    className="flex justify-center items-center w-full px-4 pt-3.5 pb-1 text-sm font-medium text-center text-brand focus:outline-none"
                  >
                    {expanded ? (
                      <>
                        <span className="inline-block ltr:pr-1 rtl:pl-1">
                          {t('text-see-less')}
                        </span>
                        <IoIosArrowUp className="text-brand-dark text-opacity-60 text-15px" />
                      </>
                    ) : (
                      <>
                        <span className="inline-block ltr:pr-1 rtl:pl-1">
                          {t('text-see-more')}
                        </span>
                        <IoIosArrowDown className="text-brand-dark text-opacity-60 text-15px" />
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
