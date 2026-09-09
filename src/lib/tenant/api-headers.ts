export interface TenantApiHeaderOptions {
  authorization?: string | null;
  contentType?: string | false;
  accept?: string | false;
  includeLegacyApiKeyAlias?: boolean;
}

type TenantApiCredentials = { apiKeyId?: string; apiSecret?: string };

/**
 * Build the standard commerce-suite API-key headers.
 *
 * `x-api-key-id` / `x-api-secret` are the canonical names used by current
 * suite routes. `X-API-Key` is available as a compatibility alias for older
 * PIM endpoints that identify the tenant from that header.
 */
export function buildTenantApiHeaders(
  config: TenantApiCredentials,
  options: TenantApiHeaderOptions = {},
): Record<string, string> {
  // Set server-side, never copy this (or identity headers) from the browser.
  const headers: Record<string, string> = { 'x-vinc-client': 'storefront' };

  if (options.accept !== false) {
    headers.Accept = options.accept || 'application/json';
  }

  if (options.contentType !== false) {
    headers['Content-Type'] = options.contentType || 'application/json';
  }

  if (config.apiKeyId && config.apiSecret) {
    headers['x-auth-method'] = 'api-key';
  }

  if (config.apiKeyId) {
    headers['x-api-key-id'] = config.apiKeyId;
    if (options.includeLegacyApiKeyAlias) {
      headers['X-API-Key'] = config.apiKeyId;
    }
  }

  if (config.apiSecret) {
    headers['x-api-secret'] = config.apiSecret;
  }

  if (options.authorization) {
    headers.Authorization = options.authorization;
  }

  return headers;
}
