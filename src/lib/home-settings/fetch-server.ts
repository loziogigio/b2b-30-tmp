import { cache } from 'react';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';
import type { HomeSettings } from '@/lib/home-settings/types';

const rawStorefrontUrl = process.env.VINC_STOREFRONT_URL || 'http://localhost:3001';

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

const VINC_STOREFRONT_BASE = resolveBaseUrl(rawStorefrontUrl);

async function fetchHomeSettingsOnce(): Promise<HomeSettings> {
  try {
    const response = await fetch(new URL('/api/b2b/home-settings', `${VINC_STOREFRONT_BASE}/`).toString(), {
      headers: {
        'Content-Type': 'application/json'
      },
      next: {
        revalidate: 300
      }
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 429) {
        return DEFAULT_HOME_SETTINGS;
      }
      throw new Error(`Failed to fetch home settings: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      console.warn(`[HomeSettings] Unexpected content-type "${contentType}" from ${VINC_STOREFRONT_BASE}, using defaults.`);
      return DEFAULT_HOME_SETTINGS;
    }

    const data = (await response.json()) as HomeSettings;
    return {
      ...DEFAULT_HOME_SETTINGS,
      ...data,
      branding: {
        ...DEFAULT_HOME_SETTINGS.branding,
        ...(data.branding ?? {})
      },
      cardStyle: {
        ...DEFAULT_HOME_SETTINGS.cardStyle,
        ...(data.cardStyle ?? {})
      }
    };
  } catch (error) {
    console.error('[HomeSettings] server fetch failed, using defaults:', error);
    return DEFAULT_HOME_SETTINGS;
  }
}

export const getServerHomeSettings = cache(fetchHomeSettingsOnce);
