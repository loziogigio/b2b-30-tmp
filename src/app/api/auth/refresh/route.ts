import { NextRequest, NextResponse } from 'next/server';
import { getSsoApiForTenant, SSOApiError } from '@/lib/sso-api';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is required' },
        { status: 400 },
      );
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

      if (!tenant) {
        console.error('[refresh] Tenant not found for hostname:', hostname);
        return NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        );
      }

      tenantId = tenant.id;
      // Note: SSO_API_URL from env takes priority over tenant.api.pimApiUrl
    }

    // Call SSO API to refresh token
    const ssoApi = getSsoApiForTenant({ tenantId, ssoApiUrl });
    const refreshResponse = await ssoApi.refresh(refresh_token);

    return NextResponse.json({
      success: true,
      token: refreshResponse.access_token,
      refresh_token: refreshResponse.refresh_token,
      expires_in: refreshResponse.expires_in,
    });
  } catch (error) {
    console.error('[refresh] Error:', error);

    if (error instanceof SSOApiError) {
      const status = error.status === 401 ? 401 : 400;
      return NextResponse.json(
        {
          success: false,
          message:
            error.status === 401
              ? 'Token non valido o scaduto'
              : error.detail || 'Refresh failed',
        },
        { status },
      );
    }

    return NextResponse.json(
      { success: false, message: 'An error occurred during token refresh' },
      { status: 500 },
    );
  }
}
