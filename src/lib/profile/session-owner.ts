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
 * The customers the current session owns, keyed by BOTH identifiers the SSO
 * token carries for each one:
 *
 *   - `erp_customer_id` — the ERP customer code (e.g. "5300"). What the ERP
 *     routes send as `customer_code`.
 *   - `id` — the VINC/SSO customer id. What the client holds as
 *     `ERP_STATIC.vinc_customer_id` and posts to /api/b2b/addresses.
 *
 * Callers receive a customer id from the client and cannot know which of the
 * two it is, so both map to the same address-code set. Keying on only one of
 * them rejects legitimate requests from the other.
 *
 * Both keys come from the SSO-validated token, never from a client-supplied
 * value, so accepting either is exactly as unforgeable as accepting one.
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
      const addressCodes = customerAddressCodes(customer);
      for (const key of [customer.erp_customer_id, customer.id]) {
        if (typeof key === 'string' && key.length > 0) {
          owned.set(key, addressCodes);
        }
      }
    }
    return owned;
  } catch {
    return null;
  }
}

/**
 * The set of ERP customer codes (relation_ids) the current session owns.
 *
 * Deliberately derived from `erp_customer_id` only — NOT from the map above,
 * which is also keyed by the VINC customer id. Callers of this function compare
 * against ERP customer codes (a record's `relation_id`, a request's
 * `customer_code`), so admitting VINC ids here would widen what they accept.
 *
 * Returns null when there is no valid session (caller should respond 401).
 */
export async function sessionOwnedCustomerCodes(
  req: NextRequest,
): Promise<Set<string> | null> {
  const token = (await cookies()).get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
  if (!token) return null;

  const result = await resolveAuthContext(req, 'validate');
  if (!result.success) return null;

  try {
    const validation = await result.context.ssoApi.validate(token);
    const authenticated = validation.authenticated ?? validation.active;
    if (!authenticated || !validation.user) return null;

    return new Set(
      (validation.user?.customers ?? [])
        .map((c) => c.erp_customer_id)
        .filter((c): c is string => typeof c === 'string' && c.length > 0),
    );
  } catch {
    return null;
  }
}
