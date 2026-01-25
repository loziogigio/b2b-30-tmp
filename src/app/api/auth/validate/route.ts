import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSsoApiForTenant, SSOApiError } from '@/lib/sso-api';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';

/**
 * Validate access token and get user info
 * Proxies to SSO /api/auth/validate endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('auth_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Resolve tenant
    let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
    // Always use SSO_API_URL from env if set
    const ssoApiUrl = process.env.SSO_API_URL || process.env.PIM_API_URL;

    if (isMultiTenant) {
      const hostname =
        request.headers.get('x-tenant-hostname') ||
        request.headers.get('host') ||
        'localhost';
      const tenant = await resolveTenant(hostname);

      if (tenant) {
        tenantId = tenant.id;
        // Note: SSO_API_URL from env takes priority over tenant.api.pimApiUrl
      }
    }

    // Call SSO validate endpoint
    const ssoApi = getSsoApiForTenant({ tenantId, ssoApiUrl });
    const validation = await ssoApi.validate(accessToken);

    // Debug: Log the full validation response
    console.log(
      '[validate] SSO validation response:',
      JSON.stringify(validation, null, 2),
    );
    console.log('[validate] user.customers:', validation.user?.customers);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: validation.user?.id,
        email: validation.user?.email || validation.username,
        name: validation.user?.name,
        role: validation.user?.role || validation.role,
        supplier_id: validation.user?.supplier_id,
        supplier_name: validation.user?.supplier_name,
        customers: validation.user?.customers || [],
      },
      tenant_id: validation.tenant_id,
      session_id: validation.session_id,
      expires_at: validation.expires_at,
    });
  } catch (error) {
    console.error('[validate] Error:', error);

    if (error instanceof SSOApiError) {
      if (error.status === 401) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
    }

    return NextResponse.json(
      { authenticated: false, error: 'Validation failed' },
      { status: 500 },
    );
  }
}
