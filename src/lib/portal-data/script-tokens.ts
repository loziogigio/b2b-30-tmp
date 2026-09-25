/**
 * Per-user portal-script tokens for the current request (server only).
 * Tokens are bound to the user and SSO session by CS, so a token that leaks
 * through any cache is useless to anyone else. They are never part of
 * HomeSettings, which is cached per tenant.
 */
import { createHash } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { AUTH_COOKIES } from '@/lib/auth/cookies';
import type { CustomScript } from '@/lib/home-settings/types';
import { resolveCsCredsForHost } from '@/lib/profile/cs-creds';
import { buildTenantApiHeaders } from '@/lib/tenant/api-headers';

export type ScriptTokenMap = Record<string, string>;

const TTL_MS = 5 * 60 * 1000;
const EXPIRY_MARGIN_MS = 60 * 1000;
const MAX_ENTRIES = 2000;
const cache = new Map<string, { tokens: ScriptTokenMap; expiresAt: number }>();

export function __resetPortalScriptTokenCache(): void {
  cache.clear();
}

export function scriptsNeedingTokens(
  scripts: CustomScript[] | undefined,
): CustomScript[] {
  return (scripts ?? []).filter(
    (script) => script.enabled && script.hasDataAccess && script.scriptId,
  );
}

/** Never throws: on any failure the page renders without tokens. */
export async function getPortalScriptTokens(
  scripts: CustomScript[] | undefined,
): Promise<ScriptTokenMap> {
  if (scriptsNeedingTokens(scripts).length === 0) return {};
  try {
    const accessToken = (await cookies())
      .get(AUTH_COOKIES.ACCESS_TOKEN)
      ?.value?.trim();
    if (!accessToken) return {};
    const headerList = await headers();
    const hostname =
      headerList.get('x-tenant-hostname') ||
      headerList.get('host') ||
      'localhost';
    const key = `${hostname}:${createHash('sha256').update(accessToken).digest('hex')}`;
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.tokens;

    const creds = await resolveCsCredsForHost(hostname);
    if (!creds.csBaseUrl || !creds.apiKeyId || !creds.apiSecret) return {};
    const res = await fetch(
      `${creds.csBaseUrl.replace(/\/+$/, '')}/api/b2b/portal-data/script-tokens`,
      {
        method: 'POST',
        headers: buildTenantApiHeaders(creds, {
          authorization: `Bearer ${accessToken}`,
        }),
        body: JSON.stringify({ portal: 'default' }),
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) {
      if (res.status >= 500)
        console.warn(
          `[portal-data] script token issuance failed: HTTP ${res.status}`,
        );
      return {};
    }
    const body = await res.json();
    const tokens: ScriptTokenMap = {};
    let expiresAt = Date.now() + TTL_MS;
    for (const entry of Array.isArray(body?.tokens) ? body.tokens : []) {
      if (
        typeof entry?.script_id !== 'string' ||
        typeof entry?.token !== 'string'
      )
        continue;
      tokens[entry.script_id] = entry.token;
      const exp = Date.parse(entry.expires_at);
      if (Number.isFinite(exp))
        expiresAt = Math.min(expiresAt, exp - EXPIRY_MARGIN_MS);
    }
    if (cache.size >= MAX_ENTRIES) cache.clear();
    if (expiresAt > Date.now()) cache.set(key, { tokens, expiresAt });
    return tokens;
  } catch (error) {
    console.warn(
      '[portal-data] script token issuance failed:',
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}
