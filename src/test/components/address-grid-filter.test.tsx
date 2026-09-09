import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

/**
 * The "Indirizzo di Consegna" modal filters its address list from a text box.
 *
 * The trap: `AddressGridB2B` derives (and re-derives) its selection from the
 * list it is handed. Passing it a pre-filtered list meant that typing a query
 * which hid the current selection silently promoted the first *visible* row to
 * selected — so hitting Salva shipped the order to an address the user never
 * picked. The grid therefore takes the full list plus a `filterQuery` and
 * narrows only what it renders.
 */

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

import AddressGridB2B from '@components/address/address-grid-b2b';

function addr(
  id: string,
  title: string,
  city: string,
  extra: Partial<AddressB2B> = {},
): AddressB2B {
  return {
    id,
    title,
    isLegalSeat: false,
    address: {
      street_address: `Via ${city} 1`,
      city,
      state: '',
      zip: '',
      country: 'IT',
    },
    ...extra,
  } as AddressB2B;
}

const MILANO = addr('C001', 'Magazzino Centrale', 'Milano');
const NAPOLI = addr('C002', 'Filiale Sud', 'Napoli');
const TORINO = addr('C003', 'Deposito Nord', 'Torino');
const ALL = [MILANO, NAPOLI, TORINO];

describe('AddressGridB2B filterQuery', () => {
  it('renders every address when no query is set', () => {
    render(<AddressGridB2B lang="it" address={ALL} />);
    expect(screen.getByText('Magazzino Centrale')).toBeInTheDocument();
    expect(screen.getByText('Filiale Sud')).toBeInTheDocument();
    expect(screen.getByText('Deposito Nord')).toBeInTheDocument();
  });

  it('renders only the addresses matching the query', () => {
    render(<AddressGridB2B lang="it" address={ALL} filterQuery="napoli" />);
    expect(screen.getByText('Filiale Sud')).toBeInTheDocument();
    expect(screen.queryByText('Magazzino Centrale')).not.toBeInTheDocument();
    expect(screen.queryByText('Deposito Nord')).not.toBeInTheDocument();
  });

  it('keeps the selection when the query hides the selected address', () => {
    const onSelect = vi.fn();
    render(
      <AddressGridB2B
        lang="it"
        address={ALL}
        initialSelectedId="C003"
        filterQuery="napoli"
        onSelect={onSelect}
      />,
    );

    // Torino is filtered out of view...
    expect(screen.queryByText('Deposito Nord')).not.toBeInTheDocument();

    // ...but it is still what Salva commits.
    fireEvent.click(screen.getByText('button-save-changes'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]?.id).toBe('C003');
  });

  it('commits the row the user picks out of the filtered list', () => {
    const onSelect = vi.fn();
    render(
      <AddressGridB2B
        lang="it"
        address={ALL}
        initialSelectedId="C001"
        filterQuery="napoli"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('Filiale Sud'));
    fireEvent.click(screen.getByText('button-save-changes'));
    expect(onSelect.mock.calls[0][0]?.id).toBe('C002');
  });

  it('tells the user the query matched nothing, not that they have no addresses', () => {
    render(<AddressGridB2B lang="it" address={ALL} filterQuery="bologna" />);
    expect(
      screen.getByText('Nessun indirizzo corrisponde alla ricerca'),
    ).toBeInTheDocument();
    expect(screen.queryByText('text-no-address-found')).not.toBeInTheDocument();
  });

  it('still says "no address found" when the account really has none', () => {
    render(<AddressGridB2B lang="it" address={[]} />);
    expect(screen.getByText('text-no-address-found')).toBeInTheDocument();
  });

  it('narrows the read-only grid too', () => {
    render(
      <AddressGridB2B lang="it" address={ALL} readOnly filterQuery="torino" />,
    );
    expect(screen.getByText('Deposito Nord')).toBeInTheDocument();
    expect(screen.queryByText('Filiale Sud')).not.toBeInTheDocument();
  });
});
