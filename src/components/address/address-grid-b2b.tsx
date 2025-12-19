'use client';
import * as React from 'react';
import { RadioGroup } from '@headlessui/react';
import { useTranslation } from 'src/app/i18n/client';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

type Props = {
  address?: AddressB2B[];
  lang: string;
  onSelect?: (addr?: AddressB2B) => void; // used only when readOnly = false
  initialSelectedId?: string | number; // used only when readOnly = false
  readOnly?: boolean; // NEW
};

function fmtAddress(a?: AddressB2B['address']) {
  if (!a) return '—';
  const row1 = a.street_address;
  const row2 = [a.zip, a.city].filter(Boolean).join(' ');
  // Filter out "0" country values (invalid data)
  const country = a.country && a.country !== '0' ? a.country : '';
  const row3 = [a.state, country].filter(Boolean).join(', ');
  return [row1, row2, row3].filter(Boolean).join('\n');
}

const AddressGridB2B: React.FC<Props> = ({
  address = [],
  lang,
  onSelect,
  initialSelectedId,
  readOnly = false,
}) => {
  const { t } = useTranslation(lang, 'common');

  // ---------- DISPLAY-ONLY MODE ----------
  if (readOnly) {
    return (
      <div className="flex h-full flex-col mt-2 text-[13px]">
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {address.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {address.map((item) => (
                <div
                  key={item.id}
                  className="border-2 border-border-base rounded-xl bg-white p-4"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-semibold text-gray-900">
                      {item.title ||
                        t('text-delivery-address') ||
                        'Delivery address'}
                    </h3>
                    {item.isDefault && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                        {t('text-default-address') || 'Default'}
                      </span>
                    )}
                    {item.isLegalSeat && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        {t('text-registered-office') || 'Registered office'}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 whitespace-pre-line leading-5 text-[13px] text-gray-800">
                    {fmtAddress(item.address)}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-gray-700">
                    {(item.contact?.phone ||
                      item.contact?.email ||
                      item.contact?.mobile) && (
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          {t('CONTACT') || 'Contact'}
                        </div>
                        <div className="truncate">
                          {item.contact?.phone || item.contact?.mobile || '—'}
                        </div>
                        {item.contact?.email && (
                          <div className="truncate" title={item.contact.email}>
                            {item.contact.email}
                          </div>
                        )}
                      </div>
                    )}

                    {(item.agent?.name ||
                      item.agent?.phone ||
                      item.agent?.email ||
                      item.agent?.code) && (
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          {t('AGENT') || 'Agent'}
                        </div>
                        <div className="truncate">
                          {item.agent?.name || item.agent?.code || '—'}
                        </div>
                        <div className="truncate">
                          {item.agent?.phone || item.agent?.email || '—'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-border-base p-5 text-center font-semibold text-brand-danger">
              {t('text-no-address-found')}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- SELECTABLE MODE (existing logic) ----------
  // Use initialSelectedId if provided, otherwise first address (API sorts default first)
  const deriveInitial = React.useCallback((): AddressB2B | undefined => {
    if (!address.length) return undefined;
    if (initialSelectedId != null) {
      const byId = address.find(
        (a) => String(a.id) === String(initialSelectedId),
      );
      if (byId) return byId;
    }
    return address[0];
  }, [address, initialSelectedId]);

  const [selected, setSelected] = React.useState<AddressB2B | undefined>(
    deriveInitial,
  );
  const [committedSelected, setCommittedSelected] = React.useState<
    AddressB2B | undefined
  >(deriveInitial);

  React.useEffect(() => {
    const initial = deriveInitial();
    setSelected((prev) =>
      prev && address.some((a) => String(a.id) === String(prev.id))
        ? prev
        : initial,
    );
    setCommittedSelected((prev) =>
      prev && address.some((a) => String(a.id) === String(prev.id))
        ? prev
        : initial,
    );
  }, [address, deriveInitial]);

  const orderedAddresses = React.useMemo(() => {
    if (!committedSelected) return address;
    return [
      committedSelected,
      ...address.filter((a) => String(a.id) !== String(committedSelected.id)),
    ];
  }, [address, committedSelected]);

  return (
    <div className="flex h-full flex-col mt-2 text-[13px]">
      <div className="max-h-[52vh] overflow-y-auto pr-1">
        <RadioGroup
          value={selected}
          onChange={setSelected}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <RadioGroup.Label className="sr-only">
            {t('address')}
          </RadioGroup.Label>

          {orderedAddresses.length ? (
            orderedAddresses.map((item) => (
              <RadioGroup.Option
                key={item.id}
                value={item}
                className={({ checked }) =>
                  `${checked ? 'border-brand ring-1 ring-brand/30' : 'border-border-base'}
                   border-2 rounded-xl bg-white p-4 focus:outline-none transition-shadow cursor-pointer`
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-semibold text-gray-900">
                      {item.title ||
                        t('text-delivery-address') ||
                        'Delivery address'}
                    </h3>
                    {item.isDefault && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                        {t('text-default-address') || 'Default'}
                      </span>
                    )}
                    {item.isLegalSeat && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        {t('text-registered-office') || 'Registered office'}
                      </span>
                    )}
                  </div>
                  <span
                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      selected?.id === item.id ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                    aria-hidden
                  />
                </div>

                <div className="mt-2 whitespace-pre-line leading-5 text-[13px] text-gray-800">
                  {fmtAddress(item.address)}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-gray-700">
                  {(item.contact?.phone ||
                    item.contact?.email ||
                    item.contact?.mobile) && (
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        {t('CONTACT') || 'Contact'}
                      </div>
                      <div className="truncate">
                        {item.contact?.phone || item.contact?.mobile || '—'}
                      </div>
                      {item.contact?.email && (
                        <div className="truncate" title={item.contact.email}>
                          {item.contact.email}
                        </div>
                      )}
                    </div>
                  )}

                  {(item.agent?.name ||
                    item.agent?.phone ||
                    item.agent?.email) && (
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        {t('AGENT') || 'Agent'}
                      </div>
                      <div className="truncate">
                        {item.agent?.name || item.agent?.code || '—'}
                      </div>
                      <div className="truncate">
                        {item.agent?.phone || item.agent?.email || '—'}
                      </div>
                    </div>
                  )}
                </div>
              </RadioGroup.Option>
            ))
          ) : (
            <div className="col-span-full rounded-lg border-2 border-dashed border-border-base p-5 text-center font-semibold text-brand-danger">
              {t('text-no-address-found')}
            </div>
          )}
        </RadioGroup>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus:outline-none"
          onClick={() => onSelect?.(selected)}
        >
          {t('button-save-changes')}
        </button>
      </div>
    </div>
  );
};

export default AddressGridB2B;
