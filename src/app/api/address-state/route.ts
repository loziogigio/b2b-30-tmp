import { NextRequest, NextResponse } from 'next/server';
import {
  ADDRESS_STATE_COOKIE,
  ADDRESS_STATE_COOKIE_MAX_AGE,
} from '@/lib/page-context';

export async function POST(request: NextRequest) {
  let addressState: string | null = null;

  try {
    const body = await request.json();
    const rawState = body?.addressState;
    if (typeof rawState === 'string' && rawState.trim().length > 0) {
      addressState = rawState.trim();
    }
  } catch {
    // Ignore JSON parse errors - we'll treat as clearing the cookie
  }

  const response = NextResponse.json({
    success: true,
    addressState,
  });

  // Use Next.js built-in cookie API - more reliable than raw headers
  if (addressState) {
    response.cookies.set(ADDRESS_STATE_COOKIE, addressState, {
      path: '/',
      sameSite: 'lax',
      maxAge: ADDRESS_STATE_COOKIE_MAX_AGE,
    });
  } else {
    response.cookies.set(ADDRESS_STATE_COOKIE, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
  }

  return response;
}
