import { NextResponse } from 'next/server';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';

export async function GET() {
  try {
    // Use private URL for server-side calls (internal Docker network)
    const pimApiUrl =
      process.env.PIM_API_PRIVATE_URL ||
      process.env.NEXT_PUBLIC_PIM_API_URL ||
      '';

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

    if (!response.ok) {
      // Return default branding settings when PIM API doesn't have config
      return NextResponse.json(DEFAULT_HOME_SETTINGS);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // Return default branding settings on error
    return NextResponse.json(DEFAULT_HOME_SETTINGS);
  }
}
