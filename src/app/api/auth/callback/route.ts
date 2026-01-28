import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';
import { getDefaultSsoApiUrl, getHostnameFromRequest } from '@/lib/auth/server';

const CLIENT_ID = 'vinc-b2b';
const CLIENT_SECRET = process.env.SSO_CLIENT_SECRET || '';

/**
 * OAuth callback handler
 * Exchanges authorization code for tokens after SSO login
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Contains the original URL user wanted
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Resolve tenant info
  let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
  let ssoApiUrl = getDefaultSsoApiUrl();

  if (isMultiTenant) {
    const hostname = getHostnameFromRequest(request);
    console.log(
      '[auth/callback] Multi-tenant mode, resolving tenant for hostname:',
      hostname,
    );

    const tenant = await resolveTenant(hostname);

    if (tenant) {
      tenantId = tenant.id;
      // SSO_API_URL_OVERRIDE takes precedence (for local dev)
      // Then try api.pimApiUrl, then builderUrl, then fallback
      ssoApiUrl =
        process.env.SSO_API_URL_OVERRIDE ||
        tenant.api.pimApiUrl ||
        tenant.builderUrl ||
        ssoApiUrl;
      console.log('[auth/callback] Tenant resolved:', {
        tenantId,
        pimApiUrl: tenant.api.pimApiUrl,
        builderUrl: tenant.builderUrl,
        ssoApiUrl,
      });
    } else {
      console.error('[auth/callback] Tenant not found for hostname:', hostname);
      console.log('[auth/callback] Using fallback SSO URL:', ssoApiUrl);
    }
  } else {
    console.log(
      '[auth/callback] Single-tenant mode, using SSO URL:',
      ssoApiUrl,
    );
  }

  // Handle error from SSO
  if (error) {
    console.error('[auth/callback] SSO error:', error, errorDescription);
    const redirectUrl = new URL('/it', request.url);
    redirectUrl.searchParams.set('auth_error', error);
    if (errorDescription) {
      redirectUrl.searchParams.set('error_message', errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // No code provided
  if (!code) {
    console.error('[auth/callback] No authorization code provided');
    const redirectUrl = new URL('/it', request.url);
    redirectUrl.searchParams.set('auth_error', 'no_code');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Build callback URL (must match what was sent to SSO)
    // Use x-forwarded-host or host header to get the actual public URL
    // (request.nextUrl.origin may return internal Docker address like 0.0.0.0:3000)
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = request.headers.get('host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

    let callbackUrl: string;
    if (forwardedHost) {
      callbackUrl = `${forwardedProto}://${forwardedHost}/api/auth/callback`;
    } else if (
      host &&
      !host.includes('0.0.0.0') &&
      !host.includes('127.0.0.1')
    ) {
      callbackUrl = `${forwardedProto}://${host}/api/auth/callback`;
    } else {
      callbackUrl = `${request.nextUrl.origin}/api/auth/callback`;
    }

    const tokenEndpoint = `${ssoApiUrl}/api/auth/token`;

    // Log the request details (without secrets)
    console.log('[auth/callback] Token exchange request:', {
      endpoint: tokenEndpoint,
      tenantId,
      clientId: CLIENT_ID,
      hasClientSecret: !!CLIENT_SECRET,
      redirectUri: callbackUrl,
      codeLength: code?.length,
    });

    // Validate configuration
    if (!ssoApiUrl) {
      console.error('[auth/callback] SSO_API_URL is not configured');
      const redirectUrl = new URL('/it', request.url);
      redirectUrl.searchParams.set('auth_error', 'config_error');
      redirectUrl.searchParams.set('error_message', 'SSO non configurato');
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange code for tokens
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      });
    } catch (fetchError) {
      // Network error - SSO server unreachable
      console.error('[auth/callback] Failed to connect to SSO:', fetchError);
      const redirectUrl = new URL('/it', request.url);
      redirectUrl.searchParams.set('auth_error', 'sso_unreachable');
      redirectUrl.searchParams.set(
        'error_message',
        `Impossibile contattare il server di autenticazione (${ssoApiUrl})`,
      );
      return NextResponse.redirect(redirectUrl);
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorData: Record<string, unknown> = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }

      console.error('[auth/callback] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
      });

      const redirectUrl = new URL('/it', request.url);
      redirectUrl.searchParams.set('auth_error', 'token_exchange_failed');

      // Include more specific error message if available
      const errorMsg =
        (errorData.error_description as string) ||
        (errorData.message as string) ||
        `Errore ${tokenResponse.status}: ${tokenResponse.statusText}`;
      redirectUrl.searchParams.set('error_message', errorMsg);

      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenResponse.json();

    // Debug: Log the full token exchange response
    console.log(
      '[auth/callback] Token exchange response:',
      JSON.stringify(tokenData, null, 2),
    );
    console.log('[auth/callback] user in response:', tokenData.user);
    console.log('[auth/callback] user.customers:', tokenData.user?.customers);

    // Store tokens in cookies
    const cookieStore = await cookies();

    // Access token - must be 'auth_token' to match getToken() in UI context
    const expiresIn = tokenData.expires_in || 900;
    cookieStore.set('auth_token', tokenData.access_token, {
      httpOnly: false, // Needed for client-side JS (getToken uses js-cookie)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
    });

    // Store token expiration timestamp for client-side auto-refresh
    const expiresAt = Date.now() + expiresIn * 1000;
    cookieStore.set('auth_token_expires_at', String(expiresAt), {
      httpOnly: false, // Client needs to read this for auto-refresh
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
    });

    // Refresh token
    if (tokenData.refresh_token) {
      cookieStore.set('refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    // Session ID
    if (tokenData.session_id) {
      cookieStore.set('session_id', tokenData.session_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    // VINC tokens if provided
    if (tokenData.vinc_tokens) {
      cookieStore.set('vinc_access_token', tokenData.vinc_tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokenData.vinc_tokens.expires_in || 3600,
        path: '/',
      });
    }

    // If user profile is included in token response, store it for client
    // This avoids an extra round-trip to the validate endpoint
    if (tokenData.user) {
      console.log('[auth/callback] Storing user profile from token response');
      cookieStore.set('sso_user_profile', JSON.stringify(tokenData.user), {
        httpOnly: false, // Client needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60, // Short-lived, just for the redirect handling
        path: '/',
      });
    }

    // Set flag to indicate profile needs to be fetched on client-side
    // This is necessary because we can't access localStorage from server
    cookieStore.set('sso_profile_pending', 'true', {
      httpOnly: false, // Client needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // Short-lived, just for the redirect
      path: '/',
    });

    // Store tenant ID for multi-tenant deployments (used for likes/reminders user ID)
    cookieStore.set('sso_tenant_id', tenantId, {
      httpOnly: false, // Client needs to read this for ERP_STATIC
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days (same as session)
      path: '/',
    });

    // Determine redirect URL
    let redirectUrl: URL;

    if (state) {
      // Decode the original URL from state
      try {
        const decodedState = decodeURIComponent(state);
        redirectUrl = new URL(decodedState, request.url);
      } catch {
        redirectUrl = new URL('/it', request.url);
      }
    } else {
      // Default redirect
      redirectUrl = new URL('/it', request.url);
    }

    // Redirect to the original page or home
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[auth/callback] Error:', error);
    const redirectUrl = new URL('/it', request.url);
    redirectUrl.searchParams.set('auth_error', 'internal_error');
    return NextResponse.redirect(redirectUrl);
  }
}
