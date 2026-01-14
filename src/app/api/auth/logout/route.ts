import { NextRequest, NextResponse } from 'next/server';

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

  // Clear auth cookie
  response.cookies.set('auth_token', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}

// GET endpoint that clears cookies and redirects
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'it';

  const response = NextResponse.redirect(new URL(`/${lang}`, request.url));

  // Clear auth cookie
  response.cookies.set('auth_token', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
