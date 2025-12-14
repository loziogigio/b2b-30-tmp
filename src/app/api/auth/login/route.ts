import { NextResponse } from 'next/server';
import { vincApi, VincApiError } from '@/lib/vinc-api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Call VINC API to login
    const loginResponse = await vincApi.auth.login({ email, password });

    // Fetch user profile with the access token
    let profile = null;
    try {
      profile = await vincApi.auth.getProfile(loginResponse.access_token);
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
