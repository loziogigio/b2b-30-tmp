import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTenantFromEnv, toPublicInfo } from '@/lib/tenant/types';

const sourceRoot = fileURLToPath(new URL('../..', import.meta.url));

function productionSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'test' ? [] : productionSources(file);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

afterEach(() => vi.unstubAllEnvs());

describe('service credentials stay in server configuration', () => {
  it('rejects public service credential names in application and build sources', () => {
    // Google Maps' browser API key is intentionally public. Tenant service
    // credentials, secrets, passwords and private keys must never be public.
    const forbidden =
      /\bNEXT_PUBLIC_(?:[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY)|(?:(?:PIM|B2B|VINC|SUITE|ERP)_)?API_KEY(?:_ID)?)\b/g;
    const root = path.dirname(sourceRoot);
    const files = [
      ...productionSources(sourceRoot),
      path.join(root, 'Dockerfile'),
      path.join(root, 'build-docker.sh'),
    ];
    const exposed = files.flatMap((file) => {
      const matches = readFileSync(file, 'utf8').match(forbidden);
      return matches
        ? [{ file: path.relative(root, file), names: matches }]
        : [];
    });
    expect(exposed).toEqual([]);
  });

  it('ignores obsolete public credentials even when the environment supplies them', () => {
    vi.stubEnv('API_KEY_ID', '');
    vi.stubEnv('API_SECRET', '');
    vi.stubEnv('PIM_API_KEY_ID', '');
    vi.stubEnv('PIM_API_SECRET', '');
    vi.stubEnv('NEXT_PUBLIC_API_KEY_ID', 'obsolete-public-key');
    vi.stubEnv('NEXT_PUBLIC_API_SECRET', 'obsolete-public-secret');
    expect(buildTenantFromEnv().api).toMatchObject({
      apiKeyId: '',
      apiSecret: '',
    });
  });

  it.each([
    ['API_KEY_ID', 'API_SECRET'],
    ['PIM_API_KEY_ID', 'PIM_API_SECRET'],
  ])(
    'loads %s/%s only on the server and excludes credentials from public tenant info',
    (keyName, secretName) => {
      for (const name of [
        'API_KEY_ID',
        'API_SECRET',
        'PIM_API_KEY_ID',
        'PIM_API_SECRET',
      ])
        vi.stubEnv(name, '');
      vi.stubEnv(keyName, 'server-key');
      vi.stubEnv(secretName, 'server-secret');
      const tenant = buildTenantFromEnv();
      expect(tenant.api).toMatchObject({
        apiKeyId: 'server-key',
        apiSecret: 'server-secret',
      });
      const publicInfo = toPublicInfo(tenant);
      expect(publicInfo).not.toHaveProperty('api');
      expect(publicInfo).not.toHaveProperty('database');
      expect(JSON.stringify(publicInfo)).not.toContain('server-secret');
    },
  );
});
