import { describe, it, expect } from 'vitest';
import { formatAddress } from '@utils/format-address';

describe('formatAddress', () => {
  it('shows "city - street" — not only the province code', () => {
    const address = {
      street_address: 'Via Roma 123',
      city: 'Milano',
      state: 'MI',
      zip: '20100',
      country: 'IT',
    };
    const out = formatAddress(address);
    expect(out).toContain('Via Roma 123');
    expect(out).toContain('Milano');
    expect(out).toBe('Milano - Via Roma 123');
  });

  it('accepts a normalized AddressB2B wrapper (nested .address)', () => {
    const wrapper = {
      id: 'a1',
      title: 'Sede',
      address: {
        street_address: 'Via Roma 123',
        city: 'Milano',
        state: 'MI',
        zip: '20100',
        country: 'IT',
      },
    };
    expect(formatAddress(wrapper)).toBe('Milano - Via Roma 123');
  });

  it('drops empty fields without leaving stray separators', () => {
    expect(formatAddress({ street_address: 'Via Roma 123', city: '' })).toBe(
      'Via Roma 123',
    );
    expect(formatAddress({ street_address: '', city: 'Milano' })).toBe(
      'Milano',
    );
  });

  it('formats the VINC foreign-address example as "city - street"', () => {
    const out = formatAddress({
      street_address: 'SASU SOMEFI',
      city: 'ARNAS',
      state: '0',
      zip: '69400',
      country: 'FR',
    });
    expect(out).toBe('ARNAS - SASU SOMEFI');
  });

  it('returns an empty string for nullish input', () => {
    expect(formatAddress(undefined)).toBe('');
    expect(formatAddress(null)).toBe('');
  });
});
