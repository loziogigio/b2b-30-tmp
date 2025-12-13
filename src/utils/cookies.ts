import Cookies from 'js-cookie';

// Cookie configuration
export const COOKIE_CONFIG = {
  path: '/',
  sameSite: 'lax' as const,
};

/**
 * Set a cookie with consistent options
 */
export function setCookie(name: string, value: string, maxAgeDays?: number) {
  Cookies.set(name, value, {
    ...COOKIE_CONFIG,
    expires: maxAgeDays,
  });
}

/**
 * Delete a cookie - handles all edge cases
 * Uses multiple removal strategies to ensure cookie is deleted regardless of how it was set
 */
export function deleteCookie(name: string) {
  // Try multiple removal strategies for different cookie configurations
  Cookies.remove(name, { path: '/' });
  Cookies.remove(name, { path: '/', sameSite: 'lax' });
  Cookies.remove(name);

  // Also use raw document.cookie for good measure
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | undefined {
  return Cookies.get(name);
}

/**
 * Clear all cookies (client-side)
 */
export function clearAllCookies() {
  const allCookies = Cookies.get();
  for (const name of Object.keys(allCookies)) {
    deleteCookie(name);
  }
}
