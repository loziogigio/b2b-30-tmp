import { NextRequest, NextResponse } from 'next/server';
import { SSOApiError } from '@/lib/sso-api';
import { resolveAuthContext } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Resolve tenant and get SSO API client
    const result = await resolveAuthContext(request, 'login');
    if (!result.success) return result.response;
    const { tenantId, ssoApi } = result.context;
    const loginResponse = await ssoApi.login({
      email,
      password,
      tenant_id: tenantId,
    });

    // Transform SSO response to match frontend expectations
    // Map user to profile format for backward compatibility
    const profile = {
      id: loginResponse.user.id,
      email: loginResponse.user.email,
      name: loginResponse.user.name,
      role: loginResponse.user.role,
      status: 'active',
      supplier_id: loginResponse.user.supplier_id,
      supplier_name: loginResponse.user.supplier_name,
      customers: loginResponse.user.customers,
      has_password: loginResponse.user.has_password,
    };

    // Create response with SSO tokens
    const response = NextResponse.json({
      success: true,
      token: loginResponse.access_token,
      refresh_token: loginResponse.refresh_token,
      expires_in: loginResponse.expires_in,
      session_id: loginResponse.session_id,
      profile,
    });

    // Store VINC tokens in httpOnly cookie for change-password
    if (loginResponse.vinc_tokens) {
      response.cookies.set(
        'vinc_access_token',
        loginResponse.vinc_tokens.access_token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: loginResponse.vinc_tokens.expires_in,
        },
      );
    }

    // Store session_id in cookie
    response.cookies.set('session_id', loginResponse.session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[login] Error:', error);

    if (error instanceof SSOApiError) {
      const status =
        error.status === 401 ? 401 : error.status === 429 ? 429 : 400;

      let message = 'Login failed';
      if (error.status === 401) {
        message = 'Credenziali non valide';
      } else if (error.status === 429) {
        message = error.lockoutUntil
          ? `Account temporaneamente bloccato. Riprova dopo ${new Date(error.lockoutUntil).toLocaleTimeString()}`
          : 'Troppi tentativi. Riprova più tardi.';
      } else if (error.detail) {
        message = error.detail;
      }

      return NextResponse.json(
        {
          success: false,
          message,
          lockout_until: error.lockoutUntil,
          attempts_remaining: error.attemptsRemaining,
        },
        { status },
      );
    }

    return NextResponse.json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 },
    );
  }
}
