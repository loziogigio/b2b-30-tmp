import type { NextRequest } from 'next/server';
import { AUTH_COOKIES, resolveAuthContext } from '@/lib/auth/server';
import type { SSOValidateResponse } from '@/lib/sso-api/types';

export function storefrontBearerToken(req: NextRequest): string | null {
  const authorization = req.headers.get('authorization');
  const token =
    authorization !== null
      ? (/^Bearer\s+(\S+)$/i.exec(authorization)?.[1] ?? '')
      : req.cookies.get(AUTH_COOKIES.ACCESS_TOKEN)?.value?.trim();
  return token && token !== 'null' && token !== 'undefined' ? token : null;
}

export type StorefrontSession = {
  token: string;
  tenantId: string;
  user: NonNullable<SSOValidateResponse['user']>;
};

/** A cookie/header is only a token candidate; trust live SSO validation. */
export async function resolveStorefrontSession(
  req: NextRequest,
  expectedTenantId?: string,
): Promise<StorefrontSession | null> {
  const token = storefrontBearerToken(req);
  if (!token) return null;
  try {
    const result = await resolveAuthContext(req, 'storefront-session');
    if (!result.success) return null;
    const tenantId = expectedTenantId ?? result.context.tenantId;
    if (!tenantId || result.context.tenantId !== tenantId) return null;
    const validation = await result.context.ssoApi.validate(token);
    if (
      (validation.authenticated ?? validation.active) !== true ||
      validation.authenticated === false ||
      validation.active === false ||
      validation.tenant_id !== tenantId ||
      !validation.user?.id ||
      (validation.exp !== undefined &&
        (!Number.isFinite(validation.exp) ||
          validation.exp * 1000 <= Date.now())) ||
      (validation.expires_at !== undefined &&
        !(Date.parse(validation.expires_at) > Date.now()))
    )
      return null;
    return { token, tenantId, user: validation.user };
  } catch {
    return null;
  }
}

export function sessionOwnsCustomer(
  session: StorefrontSession,
  id: unknown,
): boolean {
  return (
    typeof id === 'string' &&
    !!id &&
    (session.user.customers ?? []).some(
      (customer) => customer.id === id || customer.erp_customer_id === id,
    )
  );
}
