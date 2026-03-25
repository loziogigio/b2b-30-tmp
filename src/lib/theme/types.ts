export type ThemeId = 'default' | 'time';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  cssVariables: Record<string, string>;
}
