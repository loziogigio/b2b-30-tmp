import { cache } from 'react';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';
import type { HomeSettings } from '@/lib/home-settings/types';

// Use private URL for server-side calls (internal Docker network)
// Falls back to public URL for local development
const rawPimApiUrl =
  process.env.PIM_API_PRIVATE_URL ||
  process.env.NEXT_PUBLIC_PIM_API_URL ||
  'http://localhost:3001';

function resolveBaseUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '');
  } catch {
    const prefixed = raw.startsWith('http') ? raw : `http://${raw}`;
    try {
      const parsed = new URL(prefixed);
      return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '');
    } catch {
      return prefixed.replace(/\/$/, '');
    }
  }
}

const PIM_API_BASE = resolveBaseUrl(rawPimApiUrl);

async function fetchHomeSettingsOnce(): Promise<HomeSettings> {
  try {
    const url = new URL(
      '/api/b2b/home-settings',
      `${PIM_API_BASE}/`,
    ).toString();

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 300,
      },
    }).catch((fetchError) => {
      console.warn(
        '[HomeSettings] Network error, using defaults:',
        fetchError.message,
      );
      return null;
    });

    if (!response) {
      return DEFAULT_HOME_SETTINGS;
    }

    if (!response.ok) {
      console.warn(
        `[HomeSettings] Response ${response.status}, using defaults`,
      );
      return DEFAULT_HOME_SETTINGS;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      console.warn(
        `[HomeSettings] Unexpected content-type "${contentType}" from ${PIM_API_BASE}, using defaults.`,
      );
      return DEFAULT_HOME_SETTINGS;
    }

    const data = (await response.json()) as HomeSettings;
    return {
      ...DEFAULT_HOME_SETTINGS,
      ...data,
      branding: {
        ...DEFAULT_HOME_SETTINGS.branding,
        ...(data.branding ?? {}),
      },
      cardStyle: {
        ...DEFAULT_HOME_SETTINGS.cardStyle,
        ...(data.cardStyle ?? {}),
      },
    };
  } catch (error) {
    console.error('[HomeSettings] server fetch failed, using defaults:', error);
    return DEFAULT_HOME_SETTINGS;
  }
}

const cachedFetch = cache(fetchHomeSettingsOnce);

export async function getServerHomeSettings(): Promise<HomeSettings> {
  try {
    return await cachedFetch();
  } catch (error) {
    console.error(
      '[HomeSettings] Unexpected error from cached fetch, using defaults:',
      error,
    );
    return DEFAULT_HOME_SETTINGS;
  }
}
