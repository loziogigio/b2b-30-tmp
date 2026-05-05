import type { ThemeId } from './types';

const VALID_THEMES: ThemeId[] = ['default', 'time'];

/**
 * Resolve a theme id from the tenant's `b2bTheme` field. Returns "default"
 * when the value is missing or unknown — never reads process.env so the
 * tenant config remains the single source of truth.
 */
export function getThemeIdForTenant(tenantTheme?: string): ThemeId {
  if (tenantTheme && VALID_THEMES.includes(tenantTheme as ThemeId)) {
    return tenantTheme as ThemeId;
  }
  return 'default';
}

export function isModalFullWidth(): boolean {
  return process.env.NEXT_PUBLIC_MODAL_FULL_WIDTH === 'true';
}
