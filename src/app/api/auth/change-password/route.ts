import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SSOApiError } from '@/lib/sso-api';
import { resolveAuthContext } from '@/lib/auth/server';
import { AUTH_COOKIES } from '@/lib/auth';

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
    const authToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, message: 'Non autenticato' },
        { status: 401 },
      );
    }

    // Resolve tenant and get SSO API client
    const authResult = await resolveAuthContext(request, 'change-password');
    if (!authResult.success) return authResult.response;
    const { ssoApi } = authResult.context;

    // Call SSO API to change password
    const changeResult = await ssoApi.changePassword({
      accessToken: authToken,
      currentPassword,
      password,
    });

    return NextResponse.json({
      success: true,
      message: changeResult.message || 'Password cambiata con successo',
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
