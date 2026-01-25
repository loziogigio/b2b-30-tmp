import { NextRequest, NextResponse } from 'next/server';
import { getSsoApiForTenant, SSOApiError } from '@/lib/sso-api';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, ragioneSociale, contactName } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 },
      );
    }

    // Resolve tenant
    let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
    let ssoApiUrl = process.env.SSO_API_URL || process.env.PIM_API_URL;

    if (isMultiTenant) {
      const hostname =
        request.headers.get('x-tenant-hostname') ||
        request.headers.get('host') ||
        'localhost';
      const tenant = await resolveTenant(hostname);

      if (!tenant) {
        console.error(
          '[reset-password] Tenant not found for hostname:',
          hostname,
        );
        return NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        );
      }

      tenantId = tenant.id;
      ssoApiUrl = tenant.api.pimApiUrl;
    }

    // Call SSO API to reset password
    // If no password provided, SSO generates temp password and sends email
    const ssoApi = getSsoApiForTenant({ tenantId, ssoApiUrl });
    const result = await ssoApi.resetPassword({
      email: username,
      tenant_id: tenantId,
      password,
      ragioneSociale,
      contactName,
    });

    return NextResponse.json({
      success: true,
      message:
        result.message ||
        (password
          ? 'Password cambiata con successo'
          : 'Email di recupero inviata'),
    });
  } catch (error) {
    console.error('[reset-password] Error:', error);

    if (error instanceof SSOApiError) {
      // User not found or other API error
      if (error.status === 404) {
        return NextResponse.json(
          { success: false, message: 'Utente non trovato' },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { success: false, message: error.detail || 'Operazione fallita' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Si è verificato un errore' },
      { status: 500 },
    );
  }
}
