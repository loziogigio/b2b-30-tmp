import { afterEach, describe, expect, it } from 'vitest';
import { getDefaultSsoApiUrl } from '@/lib/auth/server';

const ENV_KEYS = [
  'SSO_API_URL_OVERRIDE',
  'PIM_API_URL_OVERRIDE',
  'SSO_API_URL',
  'NEXT_PUBLIC_SSO_URL',
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function clearEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

afterEach(() => {
  clearEnv();
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('getDefaultSsoApiUrl', () => {
  it('uses the explicit SSO override first', () => {
    clearEnv();
    process.env.SSO_API_URL_OVERRIDE = 'http://localhost:3002';
    process.env.PIM_API_URL_OVERRIDE = 'http://localhost:3001';
    process.env.SSO_API_URL = 'https://sso.example';

    expect(getDefaultSsoApiUrl()).toBe('http://localhost:3002');
  });

  it('uses PIM_API_URL_OVERRIDE when no SSO override is set', () => {
    clearEnv();
    process.env.PIM_API_URL_OVERRIDE = 'http://localhost:3001';
    process.env.SSO_API_URL = 'https://sso.example';

    expect(getDefaultSsoApiUrl()).toBe('http://localhost:3001');
  });

  it('falls back to configured SSO URLs without local overrides', () => {
    clearEnv();
    process.env.SSO_API_URL = 'https://sso.example';
    process.env.NEXT_PUBLIC_SSO_URL = 'https://public-sso.example';

    expect(getDefaultSsoApiUrl()).toBe('https://sso.example');
  });
});
