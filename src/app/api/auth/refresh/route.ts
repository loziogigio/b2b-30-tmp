import { NextResponse } from 'next/server';
import { vincApi, VincApiError } from '@/lib/vinc-api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is required' },
        { status: 400 },
      );
    }

    // Call VINC API to refresh token
    const refreshResponse = await vincApi.auth.refreshToken(refresh_token);

    return NextResponse.json({
      success: true,
      token: refreshResponse.access_token,
      refresh_token: refreshResponse.refresh_token,
      expires_in: refreshResponse.expires_in,
    });
  } catch (error) {
    console.error('[refresh] Error:', error);

    if (error instanceof VincApiError) {
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
