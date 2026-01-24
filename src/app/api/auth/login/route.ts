import { NextRequest, NextResponse } from 'next/server';
import { vincApi, VincApiError, getVincApiForTenant } from '@/lib/vinc-api';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';

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

    // Get VINC API client (multi-tenant aware)
    let api = vincApi;
    if (isMultiTenant) {
      const hostname =
        request.headers.get('x-tenant-hostname') ||
        request.headers.get('host') ||
        'localhost';
      const tenant = await resolveTenant(hostname);

      if (!tenant) {
        console.error('[login] Tenant not found for hostname:', hostname);
        return NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        );
      }

      api = getVincApiForTenant({ projectCode: tenant.projectCode });
    }

    // Call VINC API to login
    const loginResponse = await api.auth.login({ email, password });

    // Fetch user profile with the access token
    let profile = null;
    try {
      profile = await api.auth.getProfile(loginResponse.access_token);
    } catch (profileError) {
      console.error('[login] Failed to fetch profile:', profileError);
      // Continue without profile - login still succeeded
    }

    return NextResponse.json({
      success: true,
      token: loginResponse.access_token,
      refresh_token: loginResponse.refresh_token,
      expires_in: loginResponse.expires_in,
      profile,
    });
  } catch (error) {
    console.error('[login] Error:', error);

    if (error instanceof VincApiError) {
      const status = error.status === 401 ? 401 : 400;
      return NextResponse.json(
        {
          success: false,
          message:
            error.status === 401
              ? 'Credenziali non valide'
              : error.detail || 'Login failed',
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
