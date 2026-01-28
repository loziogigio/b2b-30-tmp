import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookiesServer } from '@/lib/auth/server';

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

  // Build redirect URL using proper host headers
  // (request.url may contain internal Docker address like 0.0.0.0:3000)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  let redirectUrl: URL;
  if (forwardedHost) {
    redirectUrl = new URL(`/${lang}`, `${forwardedProto}://${forwardedHost}`);
  } else if (host && !host.includes('0.0.0.0') && !host.includes('127.0.0.1')) {
    redirectUrl = new URL(`/${lang}`, `${forwardedProto}://${host}`);
  } else {
    redirectUrl = new URL(`/${lang}`, request.url);
  }

  // Redirect to root page
  const response = NextResponse.redirect(redirectUrl);

  // Clear all auth cookies again
  clearAuthCookiesServer(response);

  return response;
}
