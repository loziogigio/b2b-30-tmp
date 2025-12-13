import { NextResponse } from 'next/server';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';

export async function GET() {
  try {
    // Use private URL for server-side calls (internal Docker network)
    const pimApiUrl =
      process.env.PIM_API_PRIVATE_URL ||
      process.env.NEXT_PUBLIC_PIM_API_URL ||
      'http://localhost:3001';
    const response = await fetch(`${pimApiUrl}/api/b2b/home-settings`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return NextResponse.json(DEFAULT_HOME_SETTINGS);
    }

    if (response.status === 429) {
      console.warn(
        'Rate limited when fetching home settings; returning defaults.',
      );
      return NextResponse.json(DEFAULT_HOME_SETTINGS, {
        headers: {
          'x-home-settings-fallback': 'rate-limited',
        },
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/b2b/home-settings:', error);
    return NextResponse.json(DEFAULT_HOME_SETTINGS);
  }
}
