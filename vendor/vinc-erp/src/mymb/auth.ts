export interface MyMbConnection {
  /** Base URL with NO userinfo and NO trailing slash. */
  baseUrl: string;
  /** `Basic base64(user:pass)` */
  authHeader: string;
}

/**
 * Parse a MYMB connection string of the form
 * `http://user:pass@host:port/base/path` into a base URL (credentials
 * stripped) plus an HTTP Basic auth header built from the embedded userinfo.
 */
export function parseMyMbConnection(connectionUrl: string): MyMbConnection {
  const u = new URL(connectionUrl); // throws on garbage
  const user = decodeURIComponent(u.username);
  const pass = decodeURIComponent(u.password);
  if (!user || !pass) {
    throw new Error('MYMB connection URL is missing credentials (user:pass@)');
  }
  u.username = '';
  u.password = '';
  // u.toString() keeps a trailing slash for root; strip any trailing slash.
  const baseUrl = u.toString().replace(/\/+$/, '');
  const authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  return { baseUrl, authHeader };
}
