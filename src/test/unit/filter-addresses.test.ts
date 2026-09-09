import { describe, it, expect } from 'vitest';
import { filterAddresses } from '@components/address/filter-addresses';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

function addr(p: Partial<AddressB2B> & { id: string }): AddressB2B {
  return {
    title: p.title ?? '',
    isLegalSeat: false,
    address: {
      street_address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      ...(p.address ?? {}),
    },
    ...p,
  } as AddressB2B;
}

const MILANO = addr({
  id: 'C001',
  title: 'Magazzino Centrale',
  address: {
    street_address: 'Via Roma 12',
    city: 'Milano',
    state: 'MI',
    zip: '20121',
    country: 'IT',
  },
  contact: { email: 'logistica@example.com', phone: '02 1234567' },
  agent: { code: 'AG7', name: 'Bianchi' },
});

const NAPOLI = addr({
  id: 'C002',
  title: 'Filiale Sud',
  address: {
    street_address: 'Corso Umberto 4',
    city: 'Napoli',
    state: 'NA',
    zip: '80138',
    country: 'IT',
  },
  agent: { code: 'AG9', name: 'Rossi' },
});

const LIST = [MILANO, NAPOLI];

describe('filterAddresses', () => {
  it('returns the list untouched for an empty or whitespace query', () => {
    expect(filterAddresses(LIST, '')).toBe(LIST);
    expect(filterAddresses(LIST, '   ')).toBe(LIST);
  });

  it('matches on city, ignoring case', () => {
    expect(filterAddresses(LIST, 'NAPOLI')).toEqual([NAPOLI]);
    expect(filterAddresses(LIST, 'milano')).toEqual([MILANO]);
  });

  it('matches on the title, street, zip, province and ERP code', () => {
    expect(filterAddresses(LIST, 'magazzino')).toEqual([MILANO]);
    expect(filterAddresses(LIST, 'corso umberto')).toEqual([NAPOLI]);
    expect(filterAddresses(LIST, '20121')).toEqual([MILANO]);
    expect(filterAddresses(LIST, 'NA')).toEqual([NAPOLI]);
    expect(filterAddresses(LIST, 'c002')).toEqual([NAPOLI]);
  });

  it('matches on contact and agent details', () => {
    expect(filterAddresses(LIST, 'logistica@')).toEqual([MILANO]);
    expect(filterAddresses(LIST, 'rossi')).toEqual([NAPOLI]);
  });

  it('matches a partial word, like the cart search does', () => {
    expect(filterAddresses(LIST, 'ilan')).toEqual([MILANO]);
  });

  it('returns nothing when there is no match', () => {
    expect(filterAddresses(LIST, 'torino')).toEqual([]);
  });

  it('never throws on regex metacharacters — the query is a substring', () => {
    expect(() => filterAddresses(LIST, 'via (')).not.toThrow();
    expect(filterAddresses(LIST, 'via (')).toEqual([]);
    expect(
      filterAddresses([addr({ id: 'C003', title: 'Dep. (Nord)' })], '(nord'),
    ).toHaveLength(1);
  });

  it('ignores the ERP placeholder country so "0" is not a wildcard', () => {
    const noCountry = addr({
      // No digits anywhere else, so a hit could only come from the country.
      id: 'CXY',
      title: 'Deposito',
      address: {
        street_address: '',
        city: '',
        state: '',
        zip: '',
        country: '0',
      },
    });
    expect(filterAddresses([noCountry], '0')).toEqual([]);
  });
});
