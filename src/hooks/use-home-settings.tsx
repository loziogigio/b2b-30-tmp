import { useEffect, useState } from 'react';
import { useHomeSettingsContext } from '@/contexts/home-settings.context';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';
import type { HomeSettings } from '@/lib/home-settings/types';
import type {
  CompanyBranding,
  ProductCardStyle,
} from '@/lib/home-settings/types';

/**
 * Hook to fetch and use home settings
 */
export function useHomeSettings() {
  const contextValue = useHomeSettingsContext();

  const [fallbackSettings, setFallbackSettings] = useState<HomeSettings | null>(
    contextValue?.settings ?? DEFAULT_HOME_SETTINGS,
  );
  const [fallbackLoading, setFallbackLoading] = useState(
    contextValue ? contextValue.isLoading : false,
  );
  const [fallbackError, setFallbackError] = useState<string | null>(
    contextValue?.error ?? null,
  );

  const isUsingContext = Boolean(contextValue);

  useEffect(() => {
    if (contextValue) {
      setFallbackSettings(contextValue.settings);
      setFallbackLoading(contextValue.isLoading);
      setFallbackError(contextValue.error);
    }
  }, [contextValue]);

  useEffect(() => {
    if (isUsingContext) {
      return;
    }

    const fetchSettings = async () => {
      setFallbackLoading(true);
      try {
        // Internal API route - credentials are handled server-side
        const response = await fetch(`/api/b2b/home-settings`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404 || response.status === 429) {
            setFallbackSettings(DEFAULT_HOME_SETTINGS);
            setFallbackError(null);
            return;
          }
          throw new Error('Failed to fetch home settings');
        }

        const data = (await response.json()) as HomeSettings;
        setFallbackSettings({
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
          // Explicitly use API headerConfig if it has rows, otherwise use default
          headerConfig:
            data.headerConfig && data.headerConfig.rows?.length > 0
              ? data.headerConfig
              : DEFAULT_HOME_SETTINGS.headerConfig,
        });
        setFallbackError(null);
      } catch (err) {
        console.error('Error fetching home settings:', err);
        setFallbackError(err instanceof Error ? err.message : 'Unknown error');
        setFallbackSettings(DEFAULT_HOME_SETTINGS);
      } finally {
        setFallbackLoading(false);
      }
    };

    fetchSettings().catch(() => {});
  }, [isUsingContext]);

  const activeSettings = contextValue?.settings ?? fallbackSettings;

  useEffect(() => {
    if (activeSettings?.branding) {
      applyBrandingCSS(activeSettings.branding);
    }
  }, [activeSettings?.branding]);

  return {
    settings: activeSettings,
    isLoading: contextValue?.isLoading ?? fallbackLoading,
    error: contextValue?.error ?? fallbackError,
  };
}

export type {
  HomeSettings,
  CompanyBranding,
  ProductCardStyle,
  HeaderConfig,
  HeaderRow,
  HeaderBlock,
  HeaderWidget,
  HeaderWidgetType,
  WidgetConfig,
  RadioStation,
  RowLayout,
  MetaTags,
} from '@/lib/home-settings/types';

/**
 * Convert ProductCardStyle to CSS styles
 */
export function getCardStyleCSS(
  cardStyle: ProductCardStyle,
): React.CSSProperties {
  const borderRadiusMap = {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  };

  const shadowMap = {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  };

  return {
    borderWidth: `${cardStyle.borderWidth}px`,
    borderColor: cardStyle.borderColor,
    borderStyle: cardStyle.borderStyle,
    borderRadius: borderRadiusMap[cardStyle.borderRadius],
    boxShadow:
      cardStyle.shadowSize !== 'none'
        ? shadowMap[cardStyle.shadowSize]
        : 'none',
    backgroundColor: cardStyle.backgroundColor,
  };
}

/**
 * Get hover class name based on hover effect
 */
export function getCardHoverClass(
  hoverEffect: ProductCardStyle['hoverEffect'],
): string {
  switch (hoverEffect) {
    case 'lift':
      return 'hover:-translate-y-1';
    case 'shadow':
      return 'hover:shadow-lg';
    case 'scale':
      return 'hover:scale-[1.02]';
    case 'border':
      return 'hover:brightness-90';
    case 'glow':
      return 'hover:shadow-2xl';
    default:
      return '';
  }
}

/**
 * Apply custom CSS variables from branding
 */
export function applyBrandingCSS(branding: CompanyBranding) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Primary brand colors
  if (branding.primaryColor) {
    root.style.setProperty('--color-brand', branding.primaryColor);
  }

  if (branding.secondaryColor) {
    root.style.setProperty('--color-brand-secondary', branding.secondaryColor);
  }

  // Extended theme colors
  if (branding.accentColor) {
    root.style.setProperty('--color-accent', branding.accentColor);
  } else if (branding.primaryColor) {
    // Fallback accent to primary
    root.style.setProperty('--color-accent', branding.primaryColor);
  }

  if (branding.textColor) {
    root.style.setProperty('--color-text', branding.textColor);
  }

  if (branding.mutedColor) {
    root.style.setProperty('--color-muted', branding.mutedColor);
  }

  if (branding.backgroundColor) {
    root.style.setProperty('--color-background', branding.backgroundColor);
  }

  if (branding.headerBackgroundColor) {
    root.style.setProperty('--color-header-bg', branding.headerBackgroundColor);
  }

  if (branding.footerBackgroundColor) {
    root.style.setProperty('--color-footer-bg', branding.footerBackgroundColor);
  }

  if (branding.footerTextColor) {
    root.style.setProperty('--color-footer-text', branding.footerTextColor);
  }

  // Update favicon if provided
  if (branding.favicon) {
    const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (favicon) {
      favicon.href = branding.favicon;
    }
  }

  // Update title if provided
  if (branding.title) {
    // This would typically be handled in metadata, but we can update it dynamically too
    const titleSuffix = document.title.split(' - ')[1];
    if (titleSuffix) {
      document.title = `${titleSuffix} - ${branding.title}`;
    }
  }
}
