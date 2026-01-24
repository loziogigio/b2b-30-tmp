'use client';

import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { useTranslation } from 'src/app/i18n/client';

interface Props {
  lang: string;
  productType: string | null;
  label: string;
  onClear: () => void;
}

export const ProductTypeBreadcrumb = ({
  lang,
  productType,
  label,
  onClear,
}: Props) => {
  const { t } = useTranslation(lang, 'common');

  if (!productType) return null;

  return (
    <div className="block">
      <Disclosure defaultOpen>
        {({ open }) => (
          <div>
            <DisclosureButton className="w-full flex items-center justify-between px-4 py-2">
              <span className="text-brand-dark font-semibold text-sm uppercase">
                {t('text-product-type')}
              </span>
              {open ? (
                <IoIosArrowUp className="text-brand-dark text-opacity-80 text-sm" />
              ) : (
                <IoIosArrowDown className="text-brand-dark text-opacity-80 text-sm" />
              )}
            </DisclosureButton>
            <DisclosurePanel>
              <div className="flex flex-col px-4 pb-2">
                <label className="group flex items-center justify-between text-sm py-0.5 cursor-pointer transition-all hover:text-opacity-80 text-brand-dark">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="appearance-none w-4 h-4 border border-gray-300 rounded bg-white checked:bg-brand checked:border-brand cursor-pointer shrink-0"
                      checked={true}
                      onChange={onClear}
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")",
                        backgroundSize: '100% 100%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                    <span className="text-sm">{label}</span>
                  </span>
                </label>
              </div>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </div>
  );
};
