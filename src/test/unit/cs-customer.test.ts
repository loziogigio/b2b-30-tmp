import { describe, it, expect } from 'vitest';
import { csCustomerToProfile } from '@/utils/transform/cs-customer';

describe('csCustomerToProfile', () => {
  it('maps a CS customer (with legal_info) to CustomerProfile', () => {
    const p = csCustomerToProfile({
      public_code: '007959',
      external_code: '007959',
      company_name: "D'AMBRA VINCENZO",
      first_name: 'Vincenzo',
      last_name: "D'Ambra",
      customer_type: 'business',
      legal_info: {
        vat_number: 'IT01234567890',
        fiscal_code: 'DMBVCN...',
        pec_email: 'pec@example.it',
        sdi_code: 'ABCDEFG',
      },
    });
    expect(p.code).toBe('007959');
    expect(p.businessName).toBe("D'AMBRA VINCENZO");
    expect(p.firstName).toBe('Vincenzo');
    expect(p.lastName).toBe("D'Ambra");
    expect(p.taxCode).toBe('DMBVCN...');
    expect(p.vatNumber).toBe('IT01234567890');
    expect(p.pec).toBe('pec@example.it');
    expect(p.sdi).toBe('ABCDEFG');
    expect(p.isLegalEntity).toBe(true);
  });

  it('falls back to external_code and handles missing legal_info / private type', () => {
    const p = csCustomerToProfile({
      external_code: '009999',
      customer_type: 'private',
    });
    expect(p.code).toBe('009999');
    expect(p.vatNumber).toBeUndefined();
    expect(p.pec).toBeUndefined();
    expect(p.sdi).toBeUndefined();
    expect(p.isLegalEntity).toBe(false);
  });
});
