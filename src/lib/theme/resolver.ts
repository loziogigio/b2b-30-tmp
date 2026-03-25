import type { ThemeId } from './types';

const VALID_THEMES: ThemeId[] = ['default', 'time'];

export function getThemeId(): ThemeId {
  const env = process.env.NEXT_PUBLIC_THEME;
  if (env && VALID_THEMES.includes(env as ThemeId)) {
    return env as ThemeId;
  }
  return 'default';
}

export function isTimeTheme(): boolean {
  return getThemeId() === 'time';
}
