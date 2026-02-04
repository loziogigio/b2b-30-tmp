import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';
import {
  getDefaultSsoApiUrl,
  getHostnameFromRequest,
  OAUTH_CONFIG,
} from '@/lib/auth/server';
import { AUTH_COOKIES } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
  try {
    // Try to get refresh token from request body first, then from httpOnly cookie
    let refresh_token: string | undefined;

    try {
      const body = await request.json();
      refresh_token = body.refresh_token;
    } catch {
      // Empty body is OK - we'll try the cookie
    }

    // If not in body, read from httpOnly cookie (this is the secure path)
    if (!refresh_token) {
      const cookieStore = await cookies();
      refresh_token = cookieStore.get(AUTH_COOKIES.REFRESH_TOKEN)?.value;
    }

    if (!refresh_token) {
      return NextResponse.json(
        { success: false, message: 'No refresh token available' },
        { status: 401 },
      );
    }

    // Resolve tenant info for SSO URL
    let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
    let ssoApiUrl = getDefaultSsoApiUrl();

    if (isMultiTenant) {
      const hostname = getHostnameFromRequest(request);
      const tenant = await resolveTenant(hostname);

      if (tenant) {
        tenantId = tenant.id;
        // SSO_API_URL_OVERRIDE for local dev, otherwise use NEXT_PUBLIC_SSO_URL
        ssoApiUrl = process.env.SSO_API_URL_OVERRIDE || ssoApiUrl;
      }
    }

    // Call SSO refresh endpoint
    const refreshEndpoint = `${ssoApiUrl}/api/auth/refresh`;

    console.log('[refresh] Calling SSO refresh endpoint:', {
      endpoint: refreshEndpoint,
      tenantId,
    });

    const tokenResponse = await fetch(refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify({
        refresh_token,
        client_id: OAUTH_CONFIG.CLIENT_ID,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorData: Record<string, unknown> = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }

      console.error('[refresh] Token refresh failed:', {
        status: tokenResponse.status,
        error: errorData,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            (errorData.error_description as string) ||
            (errorData.error as string) ||
            'Token refresh failed',
        },
        { status: tokenResponse.status },
      );
    }

    const refreshResponse = await tokenResponse.json();

    const isProduction = process.env.NODE_ENV === 'production';
    const expiresIn = refreshResponse.expires_in || 900;

    // Create response with JSON body
    const response = NextResponse.json({
      success: true,
      token: refreshResponse.access_token,
      refresh_token: refreshResponse.refresh_token,
      expires_in: expiresIn,
    });

    // Also set cookies server-side to ensure httpOnly refresh token is updated
    // Access token (non-httpOnly so client JS can use it for API calls)
    response.cookies.set(
      AUTH_COOKIES.ACCESS_TOKEN,
      refreshResponse.access_token,
      {
        path: '/',
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: expiresIn,
      },
    );

    // Token expiration timestamp for auto-refresh scheduling
    const expiresAt = Date.now() + expiresIn * 1000;
    response.cookies.set(AUTH_COOKIES.TOKEN_EXPIRES_AT, String(expiresAt), {
      path: '/',
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: expiresIn,
    });

    // Refresh token (httpOnly for security - client cannot read this)
    if (refreshResponse.refresh_token) {
      response.cookies.set(
        AUTH_COOKIES.REFRESH_TOKEN,
        refreshResponse.refresh_token,
        {
          path: '/',
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        },
      );
    }

    return response;
  } catch (error) {
    console.error('[refresh] Unexpected error:', error);

    return NextResponse.json(
      { success: false, message: 'An error occurred during token refresh' },
      { status: 500 },
    );
  }
}
