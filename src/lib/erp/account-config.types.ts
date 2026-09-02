/**
 * Client-safe account-area display config. Kept separate from account-config.ts
 * (which dynamically imports the tenant/Redis stack) so client components — the
 * sidebars, the dashboard, use-account-settings.tsx — can import the shape
 * without pulling server-only modules into the browser bundle.
 */

export type AccountConfig = {
  /** Fido / credit-line section: sidebar entry, dashboard card and route. */
  showFido: boolean;
  /** Payment-deadlines section: sidebar entry, dashboard block and route. */
  showDeadlines: boolean;
};

/**
 * Everything visible. These sections were always rendered before the flags
 * existed, so an absent record — every tenant that never installs
 * `account_settings` — must keep showing them.
 */
export const DEFAULT_ACCOUNT_CONFIG: AccountConfig = {
  showFido: true,
  showDeadlines: true,
};

/**
 * Coerce a stored/serialised flag to visibility. Only an explicit false hides:
 * anything absent or unrecognised stays VISIBLE, so a typo or a failed lookup
 * can never silently remove a section a tenant relies on.
 */
export function asSectionVisible(value: unknown): boolean {
  return value === false || value === 'false' ? false : true;
}

/** Sidebar entry ids governed by a flag. Unlisted ids are always visible. */
const SECTION_FLAGS: Record<string, keyof AccountConfig> = {
  fido: 'showFido',
  deadlines: 'showDeadlines',
};

/**
 * Whether an account sidebar entry should render. Shared by both themes'
 * sidebars so they cannot drift apart.
 */
export function isAccountSectionVisible(
  id: string,
  config: AccountConfig,
): boolean {
  const flag = SECTION_FLAGS[id];
  return flag ? config[flag] : true;
}
