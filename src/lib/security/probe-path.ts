const SENSITIVE_DOTFILE_SEGMENT =
  /(?:^|\/)\.(?:env(?:[.-][^/]*)?|git(?:ignore|modules)?|svn|hg|aws|docker|npmrc|ssh)(?:\/|$)/i;
const PHP_SCRIPT_SEGMENT = /\.php(?:\/|$)/i;
const COMMON_EXPLOIT_PATH =
  /(?:^|\/)(?:wp-admin|wp-content|wp-includes|wordpress|phpmyadmin|server-status|cgi-bin|vendor\/phpunit)(?:\/|$)/i;

function safelyDecodePath(pathname: string): string {
  let decoded = pathname;
  // Decode twice so a double-encoded dot cannot bypass the cheap rejection.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

/**
 * Requests for these paths are automated exploit probes, not storefront URLs.
 * Reject them before locale redirects, tenant lookup and React rendering.
 */
export function isObviousExploitProbe(pathname: string): boolean {
  const decoded = safelyDecodePath(pathname);
  return (
    SENSITIVE_DOTFILE_SEGMENT.test(decoded) ||
    PHP_SCRIPT_SEGMENT.test(decoded) ||
    COMMON_EXPLOIT_PATH.test(decoded)
  );
}
