import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSsoApiForTenant, SSOApiError } from '@/lib/sso-api';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, password } = body;

    if (!currentPassword || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Current password and new password are required',
        },
        { status: 400 },
      );
    }

    // Get SSO access token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, message: 'Non autenticato' },
        { status: 401 },
      );
    }

    // Resolve tenant
    let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
    // Always use SSO_API_URL from env for auth endpoints
    const ssoApiUrl = process.env.SSO_API_URL || process.env.PIM_API_URL;

    if (isMultiTenant) {
      const hostname =
        request.headers.get('x-tenant-hostname') ||
        request.headers.get('host') ||
        'localhost';
      const tenant = await resolveTenant(hostname);

      if (!tenant) {
        console.error(
          '[change-password] Tenant not found for hostname:',
          hostname,
        );
        return NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        );
      }

      tenantId = tenant.id;
    }

    // Call SSO API to change password
    // SSO API extracts email from access token and verifies current password internally
    const ssoApi = getSsoApiForTenant({ tenantId, ssoApiUrl });
    const result = await ssoApi.changePassword({
      accessToken: authToken,
      currentPassword,
      password,
    });

    return NextResponse.json({
      success: true,
      message: result.message || 'Password cambiata con successo',
    });
  } catch (error) {
    console.error('[change-password] Error:', error);

    if (error instanceof SSOApiError) {
      const status = error.status === 401 ? 401 : 400;

      // Map error messages to translated versions
      let message = 'Cambio password fallito';
      if (error.status === 401) {
        message = 'La password attuale non è corretta';
      } else if (error.status === 422) {
        message = 'La nuova password deve essere di almeno 4 caratteri';
      } else if (error.detail) {
        message = error.detail;
      }

      return NextResponse.json({ success: false, message }, { status });
    }

    return NextResponse.json(
      { success: false, message: 'Si è verificato un errore' },
      { status: 500 },
    );
  }
}
