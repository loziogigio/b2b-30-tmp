import { NextRequest, NextResponse } from 'next/server';

// Helper to clear all auth cookies
function clearAuthCookies(response: NextResponse) {
  const cookieOptions = {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  };

  response.cookies.set('auth_token', '', cookieOptions);
  response.cookies.set('access_token', '', cookieOptions);
  response.cookies.set('refresh_token', '', cookieOptions);
}

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
  clearAuthCookies(response);

  return response;
}

// GET - Second step: clear cookies again and redirect to root
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'it';

  // Redirect to root page
  const response = NextResponse.redirect(new URL(`/${lang}`, request.url));

  // Clear all auth cookies again
  clearAuthCookies(response);

  return response;
}
