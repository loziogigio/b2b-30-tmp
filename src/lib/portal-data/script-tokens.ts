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
/**
 * How long a failed mint (missing creds, CS rejection, network/timeout/JSON
 * error) is cached. Bounds both the log volume and the CS call rate for a
 * user CS keeps refusing, without wedging a refreshed token behind it — a
 * new access token hashes to a different cache key.
 */
const FAILURE_TTL_MS = 60 * 1000;
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

function storeInCache(
  key: string,
  tokens: ScriptTokenMap,
  expiresAt: number,
): void {
  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(key, { tokens, expiresAt });
}

/** Never throws: on any failure the page renders without tokens. */
export async function getPortalScriptTokens(
  scripts: CustomScript[] | undefined,
): Promise<ScriptTokenMap> {
  if (scriptsNeedingTokens(scripts).length === 0) return {};
  // Populated once the hostname/cache key are known, so the catch block can
  // still identify and cache-fail a request that blew up after that point.
  let hostname = 'unknown';
  let key: string | undefined;
  try {
    const accessToken = (await cookies())
      .get(AUTH_COOKIES.ACCESS_TOKEN)
      ?.value?.trim();
    if (!accessToken) return {};
    const headerList = await headers();
    hostname =
      headerList.get('x-tenant-hostname') ||
      headerList.get('host') ||
      'localhost';
    key = `${hostname}:${createHash('sha256').update(accessToken).digest('hex')}`;
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.tokens;

    const creds = await resolveCsCredsForHost(hostname);
    if (!creds.csBaseUrl || !creds.apiKeyId || !creds.apiSecret) {
      console.warn(
        `[portal-data] script token issuance failed: missing CS credentials for host ${hostname}`,
      );
      storeInCache(key, {}, Date.now() + FAILURE_TTL_MS);
      return {};
    }
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
      console.warn(
        `[portal-data] script token issuance failed: HTTP ${res.status} for host ${hostname}`,
      );
      storeInCache(key, {}, Date.now() + FAILURE_TTL_MS);
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
    if (expiresAt > Date.now()) storeInCache(key, tokens, expiresAt);
    return tokens;
  } catch (error) {
    console.warn(
      `[portal-data] script token issuance failed for host ${hostname}:`,
      error instanceof Error ? error.message : error,
    );
    if (key) storeInCache(key, {}, Date.now() + FAILURE_TTL_MS);
    return {};
  }
}
