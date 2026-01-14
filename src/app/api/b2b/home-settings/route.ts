import { NextResponse } from 'next/server';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';

export async function GET() {
  try {
    // Use private URL for server-side calls (internal Docker network)
    const pimApiUrl =
      process.env.PIM_API_PRIVATE_URL ||
      process.env.NEXT_PUBLIC_PIM_API_URL ||
      'http://localhost:3001';

    // Get API keys from environment (use server-side vars if available)
    const apiKeyId =
      process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
    const apiSecret =
      process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

    const response = await fetch(`${pimApiUrl}/api/b2b/home-settings`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKeyId && { 'X-API-Key': apiKeyId }),
        ...(apiSecret && { 'X-API-Secret': apiSecret }),
      },
    });

    if (response.status === 404) {
      return NextResponse.json(DEFAULT_HOME_SETTINGS);
    }

    if (response.status === 401) {
      console.warn(
        '[HomeSettings] 401 Unauthorized - API keys may be missing or invalid.',
        {
          apiKeyId: apiKeyId ? 'set' : 'missing',
          apiSecret: apiSecret ? 'set' : 'missing',
        },
      );
      return NextResponse.json(DEFAULT_HOME_SETTINGS, {
        headers: {
          'x-home-settings-fallback': 'unauthorized',
        },
      });
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
      const errorText = await response.text();
      console.error(
        '[HomeSettings] Backend error:',
        response.status,
        errorText,
      );
      throw new Error(`Failed to fetch settings: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/b2b/home-settings:', error);
    return NextResponse.json(DEFAULT_HOME_SETTINGS);
  }
}
