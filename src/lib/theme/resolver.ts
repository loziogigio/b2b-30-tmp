import type { ThemeId } from './types';

const VALID_THEMES: ThemeId[] = ['default', 'time'];

export function getThemeId(): ThemeId {
  const env = process.env.NEXT_PUBLIC_THEME;
  if (env && VALID_THEMES.includes(env as ThemeId)) {
    return env as ThemeId;
  }
  return 'default';
}

/**
 * Resolve theme from tenant config, falling back to env var then "default".
 */
export function getThemeIdForTenant(tenantTheme?: string): ThemeId {
  if (tenantTheme && VALID_THEMES.includes(tenantTheme as ThemeId)) {
    return tenantTheme as ThemeId;
  }
  return getThemeId();
}

export function isTimeTheme(): boolean {
  return getThemeId() === 'time';
}
