'use client';

import React, { useEffect, useState } from 'react';
import { CheckBox } from '@components/ui/form/checkbox';
import { usePathname, useSearchParams } from 'next/navigation';
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import Heading from '@components/ui/heading';
import { useTranslation } from 'src/app/i18n/client';
import useQueryParam from '@utils/use-query-params';

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

export const FiltersB2BItem = ({ lang, filterKey, label, values }: FiltersB2BItemProps) => {
  const { t } = useTranslation(lang, 'common');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { updateQueryparams } = useQueryParam(pathname ?? '/');
  const [formState, setFormState] = useState<string[]>([]);

  const queryKey = `filters-${filterKey}`; // ✅ THIS IS THE KEY USED IN URL
  const queryParamValue = searchParams?.get(queryKey);

  useEffect(() => {
    updateQueryparams(queryKey, formState.join(','));
  }, [formState]);

  useEffect(() => {
    setFormState(queryParamValue?.split(',') ?? []);
  }, [queryParamValue]);

  function handleItemClick(e: React.FormEvent<HTMLInputElement>): void {
    const { value } = e.currentTarget;
    setFormState(
      formState.includes(value)
        ? formState.filter((item) => item !== value)
        : [...formState, value]
    );
  }

  return (
    <div className="block">
      <Heading className="mb-5 -mt-1">{label}</Heading>
      <div className="flex flex-col p-5 border rounded-md border-border-base">
        {values.slice(0, 3).map((item) => (
          <CheckBox
            key={`${filterKey}-${item.value}`}
            label={`${item.label} (${item.count})`}
            name={`${filterKey}-${item.value}`}
            checked={formState.includes(item.value)}
            value={item.value}
            onChange={handleItemClick}
            lang={lang}
          />
        ))}

        {values.length > 3 && (
          <div className="w-full">
            <Disclosure>
              {({ open }) => (
                <div>
                  <DisclosurePanel className="pt-4 pb-2">
                    {values.slice(3).map((item) => (
                      <CheckBox
                        key={`${filterKey}-${item.value}`}
                        label={item.label}
                        name={`${filterKey}-${item.value}`}
                        checked={formState.includes(item.value)}
                        value={item.value}
                        onChange={handleItemClick}
                        lang={lang}
                      />
                    ))}
                  </DisclosurePanel>
                  <DisclosureButton className="flex justify-center items-center w-full px-4 pt-3.5 pb-1 text-sm font-medium text-center text-brand focus:outline-none">
                    {open ? (
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
                  </DisclosureButton>
                </div>
              )}
            </Disclosure>
          </div>
        )}
      </div>
    </div>
  );
};
