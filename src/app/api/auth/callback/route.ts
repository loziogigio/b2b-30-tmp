import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';
import {
  AUTH_COOKIES,
  AUTH_COOKIE_MAX_AGE_SECONDS,
  authCookieOptions,
  getDefaultSsoApiUrl,
  getHostnameFromRequest,
  getPublicOrigin,
  OAUTH_CONFIG,
  setAuthTokensServer,
} from '@/lib/auth/server';

function getPostAuthRedirectUrl(state: string | null, publicOrigin: string) {
  if (!state) {
    return new URL('/it', publicOrigin);
  }

  try {
    return new URL(decodeURIComponent(state), publicOrigin);
  } catch {
    return new URL('/it', publicOrigin);
  }
}

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
      console.log('[auth/callback] Tenant resolved:', {
        tenantId,
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

  // Get public origin for redirects (Docker uses internal 0.0.0.0 address)
  const publicOrigin = getPublicOrigin(request);

  // Handle error from SSO
  if (error) {
    console.error('[auth/callback] SSO error:', error, errorDescription);
    const redirectUrl = new URL('/it', publicOrigin);
    redirectUrl.searchParams.set('auth_error', error);
    if (errorDescription) {
      redirectUrl.searchParams.set('error_message', errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // No code provided
  if (!code) {
    console.error('[auth/callback] No authorization code provided');
    const redirectUrl = new URL('/it', publicOrigin);
    redirectUrl.searchParams.set('auth_error', 'no_code');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Build callback URL using public origin (for Docker environments)
    const callbackUrl = `${publicOrigin}/api/auth/callback`;
    const tokenEndpoint = `${ssoApiUrl}/api/auth/token`;

    // Log the request details (without secrets)
    console.log('[auth/callback] Token exchange request:', {
      endpoint: tokenEndpoint,
      tenantId,
      clientId: OAUTH_CONFIG.CLIENT_ID,
      hasClientSecret: !!OAUTH_CONFIG.CLIENT_SECRET,
      redirectUri: callbackUrl,
      codeLength: code?.length,
    });

    // Validate configuration
    if (!ssoApiUrl) {
      console.error('[auth/callback] SSO_API_URL is not configured');
      const redirectUrl = new URL('/it', publicOrigin);
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
          client_id: OAUTH_CONFIG.CLIENT_ID,
          client_secret: OAUTH_CONFIG.CLIENT_SECRET,
        }),
      });
    } catch (fetchError) {
      // Network error - SSO server unreachable
      console.error('[auth/callback] Failed to connect to SSO:', fetchError);
      const redirectUrl = new URL('/it', publicOrigin);
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

      const redirectUrl = new URL('/it', publicOrigin);
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

    console.log('[auth/callback] Token exchange response:', {
      tenantId: tokenData.tenant_id,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      hasUser: !!tokenData.user,
      customerCount: tokenData.user?.customers?.length ?? 0,
    });

    // Defense-in-depth: refuse to set auth cookies if the IdP returned tokens
    // for a different tenant than this storefront serves. This prevents a
    // cross-tenant data leak if the IdP's session-tenant guard ever regresses.
    if (!tokenData.tenant_id || tokenData.tenant_id !== tenantId) {
      console.error('[auth/callback] tenant_id mismatch', {
        expected: tenantId,
        received: tokenData.tenant_id,
      });
      const redirectUrl = new URL('/it', publicOrigin);
      redirectUrl.searchParams.set('auth_error', 'tenant_mismatch');
      return NextResponse.redirect(redirectUrl);
    }

    const expiresIn = tokenData.expires_in || 900;
    const redirectUrl = getPostAuthRedirectUrl(state, publicOrigin);
    const response = NextResponse.redirect(redirectUrl);

    setAuthTokensServer(response, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn,
      sessionId: tokenData.session_id,
    });

    // VINC tokens if provided
    if (tokenData.vinc_tokens) {
      response.cookies.set(
        AUTH_COOKIES.VINC_ACCESS_TOKEN,
        tokenData.vinc_tokens.access_token,
        authCookieOptions({
          httpOnly: true,
          maxAge:
            tokenData.vinc_tokens.expires_in ||
            AUTH_COOKIE_MAX_AGE_SECONDS.ACCESS_TOKEN_FALLBACK,
        }),
      );
    }

    // If user profile is included in token response, store a minimal slice for
    // the client. The full user object can include hundreds of addresses which
    // easily exceeds the 4 KB browser cookie limit and causes the cookie to be
    // silently dropped. We only need erp_customer_id and erp_address_id (first
    // address) for applyVincProfileToErpStatic — strip everything else.
    if (tokenData.user) {
      const minimalProfile = {
        id: tokenData.user.id,
        email: tokenData.user.email,
        name: tokenData.user.name,
        role: tokenData.user.role,
        supplier_id: tokenData.user.supplier_id,
        supplier_name: tokenData.user.supplier_name,
        customers: (tokenData.user.customers ?? []).map((c: any) => ({
          id: c.id,
          erp_customer_id: c.erp_customer_id,
          name: c.name,
          business_name: c.business_name,
          // Keep only the first address — that's all applyVincProfileToErpStatic uses
          addresses:
            Array.isArray(c.addresses) && c.addresses.length > 0
              ? [
                  {
                    id: c.addresses[0].id,
                    erp_address_id: c.addresses[0].erp_address_id,
                  },
                ]
              : [],
        })),
      };
      console.log(
        '[auth/callback] Storing minimal user profile (addresses trimmed to first)',
      );
      response.cookies.set(
        AUTH_COOKIES.SSO_USER_PROFILE,
        JSON.stringify(minimalProfile),
        authCookieOptions({
          maxAge: AUTH_COOKIE_MAX_AGE_SECONDS.PROFILE_BOOTSTRAP,
        }),
      );
    }

    // Set flag to indicate profile needs to be fetched on client-side
    // This is necessary because we can't access localStorage from server
    response.cookies.set(
      AUTH_COOKIES.SSO_PROFILE_PENDING,
      'true',
      authCookieOptions({
        maxAge: AUTH_COOKIE_MAX_AGE_SECONDS.PROFILE_BOOTSTRAP,
      }),
    );

    // Store tenant ID for multi-tenant deployments (used for likes/reminders user ID)
    response.cookies.set(
      AUTH_COOKIES.SSO_TENANT_ID,
      tenantId,
      authCookieOptions({ maxAge: AUTH_COOKIE_MAX_AGE_SECONDS.SESSION }),
    );

    // Redirect to the original page or home
    return response;
  } catch (error) {
    console.error('[auth/callback] Error:', error);
    const redirectUrl = new URL('/it', publicOrigin);
    redirectUrl.searchParams.set('auth_error', 'internal_error');
    return NextResponse.redirect(redirectUrl);
  }
}
