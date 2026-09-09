import type { StorefrontSession } from '@/lib/auth/storefront-session';
import type { ProfileModel } from '@/lib/profile/vinc-data-models';

/** Profile relation_ids are ERP customer codes, never VINC customer IDs. */
export function profileCustomer(
  session: StorefrontSession,
  relationId: unknown,
) {
  if (
    typeof relationId !== 'string' ||
    !relationId ||
    !Array.isArray(session.user.customers)
  )
    return undefined;
  return session.user.customers.find(
    (customer) => customer?.erp_customer_id === relationId,
  );
}

/**
 * Check returned customer/address scope in addition to Suite's live grants.
 * The explicit all-address flag comes from live SSO validation, never browser
 * context. The SSO address list alone cannot establish unrestricted access.
 * Every fetch therefore forwards the storefront marker and validated token.
 */
export function sessionOwnsProfileRecord(
  session: StorefrontSession,
  model: ProfileModel,
  record: any,
): boolean {
  const customer = profileCustomer(session, record?.relation_id);
  if (!customer) return false;
  if (customer.has_all_address_access === true) return true;
  const addressCode =
    model === 'historical_order'
      ? record?.data?.shipping_address?.code
      : ['invoice', 'delivery_note'].includes(model)
        ? record?.data?.destinazione?.code
        : undefined;
  return (
    typeof addressCode === 'string' &&
    addressCode.length > 0 &&
    Array.isArray(customer.addresses) &&
    customer.addresses.some(
      (address) => address?.erp_address_id === addressCode,
    )
  );
}

export function isProfileRecordId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}
