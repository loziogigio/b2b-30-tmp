/**
 * Resolve the request path for an ERP endpoint based on the active theme.
 *
 * - time theme  → the in-app direct-ERP route: `/api/erp/<endpoint>`
 * - other themes → the legacy proxy-relative endpoint (unchanged): `<endpoint>`
 *   (the shared `post()` helper prefixes `/api/proxy/b2b`).
 *
 * `relativeEndpoint` is the legacy value, e.g. `/erp/get_multiple_prices`.
 */
export function erpApiPath(
  theme: string | undefined,
  relativeEndpoint: string,
): string {
  if (theme === 'time') {
    // Strip a leading `/erp` segment; mount under `/api/erp`.
    const tail = relativeEndpoint.replace(/^\/?erp\//, '');
    return `/api/erp/${tail}`;
  }
  return relativeEndpoint;
}
