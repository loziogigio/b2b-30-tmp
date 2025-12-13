import { NextRequest, NextResponse } from 'next/server';
import { ADDRESS_STATE_COOKIE } from '@/lib/page-context';

export async function POST(request: NextRequest) {
  // Get the lang from the request body or default to 'it'
  let lang = 'it';
  try {
    const body = await request.json();
    lang = body.lang || 'it';
  } catch {
    // If no body, use default
  }

  // Create response with cookie deletion headers
  const response = NextResponse.json({
    success: true,
    redirectUrl: `/${lang}`,
  });

  // Use Next.js built-in cookie deletion with explicit path to match how they were set
  response.cookies.set('auth_token', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
  response.cookies.set(ADDRESS_STATE_COOKIE, '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}

// GET endpoint that clears cookies and redirects - more reliable for cookie deletion
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'it';

  // Redirect response - browser will process Set-Cookie BEFORE following redirect
  const response = NextResponse.redirect(new URL(`/${lang}`, request.url));

  // Clear cookies as part of redirect
  response.cookies.set('auth_token', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
  response.cookies.set(ADDRESS_STATE_COOKIE, '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
