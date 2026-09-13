import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

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
const TORINO = addr('C003', 'Deposito Nord', 'Torino', {
  agent: { name: 'Mario Agente', code: 'AG1', phone: '333 1234567' },
} as Partial<AddressB2B>);
const ALL = [MILANO, NAPOLI, TORINO];

const cardTitles = () =>
  screen.getAllByRole('radio').map((el) => el.querySelector('h3')?.textContent);

describe('AddressGridB2B — card order', () => {
  it('keeps the API order: the selected address is not hoisted to the front', () => {
    render(<AddressGridB2B lang="it" address={ALL} initialSelectedId="C003" />);
    expect(cardTitles()).toEqual([
      'Magazzino Centrale',
      'Filiale Sud',
      'Deposito Nord',
    ]);
  });

  it('does not reshuffle the grid when the user picks another address', () => {
    render(<AddressGridB2B lang="it" address={ALL} initialSelectedId="C001" />);
    fireEvent.click(screen.getByText('Filiale Sud'));
    expect(cardTitles()).toEqual([
      'Magazzino Centrale',
      'Filiale Sud',
      'Deposito Nord',
    ]);
  });
});

describe('AddressGridB2B — agent info', () => {
  it('does not show the sales-agent block in the picker', () => {
    render(<AddressGridB2B lang="it" address={ALL} />);
    expect(screen.queryByText('AGENT')).not.toBeInTheDocument();
    expect(screen.queryByText('Mario Agente')).not.toBeInTheDocument();
    expect(screen.queryByText('333 1234567')).not.toBeInTheDocument();
  });
});
