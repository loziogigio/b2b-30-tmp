/**
 * Guard against a redirect silently stripping the end-user bearer.
 *
 * Node's fetch drops `Authorization` when it follows a redirect that crosses
 * origin — and a plain `http://` -> `https://` 308 counts, because the scheme
 * is part of the origin. The tenant credentials (`x-api-key-id`,
 * `x-api-secret`, `x-auth-method`) are custom headers, so they survive.
 *
 * The result is the worst kind of failure: the request still authenticates as
 * the tenant, so the catalog and pricing look completely normal, but the
 * END-USER identity vanishes. Commerce Suite then treats the caller as a guest
 * and strips `is_public:false` media and dynamic-block elements — and its
 * bearer check returns early without logging, so nothing anywhere records why.
 *
 * Seen in production on 2026-09-01: `baseprotection-com`'s `pim_api_url` was
 * `http://cs.vendereincloud.it`, which 308s to https. Logged-in users saw only
 * the public Conformity PDFs. The fix is to point the tenant at a URL that does
 * not redirect (`http://vinc-cs:3000` internally); this warning exists so the
 * next occurrence is one grep away instead of a day of bisecting.
 */
export function warnIfRedirectDroppedAuth(
  response: Pick<Response, 'url' | 'redirected'>,
  requestUrl: string,
  sentAuthorization: boolean,
): boolean {
  if (!sentAuthorization || !response.redirected) return false;

  let requestOrigin: string;
  let responseOrigin: string;
  try {
    requestOrigin = new URL(requestUrl).origin;
    responseOrigin = new URL(response.url).origin;
  } catch {
    // Unparseable URL: nothing useful to compare, and this helper must never
    // be the reason a product request fails.
    return false;
  }

  // A same-origin redirect keeps the header, so it is not a problem.
  if (requestOrigin === responseOrigin) return false;

  console.warn(
    `[auth-redirect] Authorization was DROPPED: ${requestUrl} redirected ` +
      `cross-origin to ${response.url}. The tenant API key still applies, so ` +
      `this request is served as a GUEST — non-public media and block elements ` +
      `will be stripped. Point the tenant's pim_api_url at a URL that does not ` +
      `redirect (e.g. http://vinc-cs:3000).`,
  );
  return true;
}
