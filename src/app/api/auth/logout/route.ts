import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookiesServer, getPublicOrigin } from '@/lib/auth/server';

// POST - First step: clear cookies
export async function POST(request: NextRequest) {
  let lang = 'it';
  try {
    const body = await request.json();
    lang = body.lang || 'it';
  } catch {
    // If no body, use default
  }

  const response = NextResponse.json({
    success: true,
    redirectUrl: `/${lang}`,
  });

  // Clear all auth cookies
  clearAuthCookiesServer(response);

  return response;
}

// GET - Second step: clear cookies again and redirect to root
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'it';

  // Build redirect URL using public origin (handles Docker/proxy)
  const publicOrigin = getPublicOrigin(request);
  const redirectUrl = new URL(`/${lang}`, publicOrigin);

  // Redirect to root page
  const response = NextResponse.redirect(redirectUrl);

  // Clear all auth cookies again
  clearAuthCookiesServer(response);

  return response;
}
