import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIES } from '@/lib/auth';
import { resolveAuthContext } from '@/lib/auth/server';

/** SSO customer shape → the address codes enabled on it. Pure. */
export function customerAddressCodes(customer: {
  addresses?: Array<{ erp_address_id?: string }>;
}): Set<string> {
  return new Set(
    (customer.addresses ?? [])
      .map((a) => a.erp_address_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
}

/**
 * The ERP customers the current session owns, mapped to the set of
 * `erp_address_id`s that were enabled for this user at activation.
 * Derived from the SSO-validated token — NOT from any client-supplied value.
 * Returns null when there is no valid session (caller should respond 401).
 */
export async function sessionOwnedCustomers(
  req: NextRequest,
): Promise<Map<string, Set<string>> | null> {
  const token = (await cookies()).get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
  if (!token) return null;

  const result = await resolveAuthContext(req, 'validate');
  if (!result.success) return null;

  try {
    const validation = await result.context.ssoApi.validate(token);
    const authenticated = validation.authenticated ?? validation.active;
    if (!authenticated || !validation.user) return null;

    const owned = new Map<string, Set<string>>();
    for (const customer of validation.user?.customers ?? []) {
      const code = customer.erp_customer_id;
      if (typeof code !== 'string' || code.length === 0) continue;
      owned.set(code, customerAddressCodes(customer));
    }
    return owned;
  } catch {
    return null;
  }
}

/**
 * The set of ERP customer codes (relation_ids) the current session owns.
 * Returns null when there is no valid session (caller should respond 401).
 */
export async function sessionOwnedCustomerCodes(
  req: NextRequest,
): Promise<Set<string> | null> {
  const owned = await sessionOwnedCustomers(req);
  return owned ? new Set(owned.keys()) : null;
}
