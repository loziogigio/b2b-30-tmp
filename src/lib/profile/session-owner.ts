import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIES } from '@/lib/auth';
import { resolveAuthContext } from '@/lib/auth/server';

/**
 * The set of ERP customer codes (relation_ids) the current session owns,
 * derived from the SSO-validated token — NOT from any client-supplied value.
 * Returns null when there is no valid session (caller should respond 401).
 * Mirrors src/app/api/auth/validate/route.ts.
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
    const codes = (validation.user?.customers ?? [])
      .map((c) => c.erp_customer_id)
      .filter((c): c is string => typeof c === 'string' && c.length > 0);
    return new Set(codes);
  } catch {
    return null;
  }
}
