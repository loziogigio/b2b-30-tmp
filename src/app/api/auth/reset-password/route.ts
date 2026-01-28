import { NextRequest, NextResponse } from 'next/server';
import { SSOApiError } from '@/lib/sso-api';
import { resolveAuthContext } from '@/lib/auth/server';

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

    // Resolve tenant and get SSO API client
    const authResult = await resolveAuthContext(request, 'reset-password');
    if (!authResult.success) return authResult.response;
    const { tenantId, ssoApi } = authResult.context;

    // Call SSO API to reset password
    const resetResult = await ssoApi.resetPassword({
      email: username,
      tenant_id: tenantId,
      password,
      ragioneSociale,
      contactName,
    });

    return NextResponse.json({
      success: true,
      message:
        resetResult.message ||
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
