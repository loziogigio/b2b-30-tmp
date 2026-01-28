import { NextRequest, NextResponse } from 'next/server';
import { SSOApiError } from '@/lib/sso-api';
import { resolveAuthContext } from '@/lib/auth/server';

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

    // Resolve tenant and get SSO API client
    const result = await resolveAuthContext(request, 'refresh');
    if (!result.success) return result.response;
    const { ssoApi } = result.context;
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
