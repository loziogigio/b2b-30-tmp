import type { CustomerProfile } from '@framework/acccount/types-b2b-account';

export interface CsCustomerRecord {
  public_code?: string;
  external_code?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  customer_type?: 'business' | 'private' | 'reseller' | string;
  legal_info?: {
    vat_number?: string;
    fiscal_code?: string;
    pec_email?: string;
    sdi_code?: string;
  };
}

/** Map a Commerce-Suite customer record to the existing CustomerProfile shape. */
export function csCustomerToProfile(c: CsCustomerRecord): CustomerProfile {
  const legal = c.legal_info ?? {};
  return {
    code: c.public_code || c.external_code || '',
    businessName: c.company_name || undefined,
    firstName: c.first_name || undefined,
    lastName: c.last_name || undefined,
    taxCode: legal.fiscal_code || undefined,
    vatNumber: legal.vat_number || undefined,
    pec: legal.pec_email || undefined,
    sdi: legal.sdi_code || undefined,
    isLegalEntity: c.customer_type !== 'private',
  };
}
