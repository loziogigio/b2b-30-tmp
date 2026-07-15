import { describe, it, expect } from 'vitest';
import { mapArxivarRecord } from '@/lib/erp/arxivar-config';

describe('mapArxivarRecord', () => {
  it('prefers record api_user/api_password for the Basic header', () => {
    const cfg = mapArxivarRecord({
      enabled: true,
      api_url: 'http://host:8883/MyMB/Service/web/',
      api_user: 'foo',
      api_password: 'bar',
    });
    expect(cfg.enabled).toBe(true);
    expect(cfg.baseUrl).toBe('http://host:8883/MyMB/Service/web'); // trailing slash stripped
    expect(cfg.authHeader).toBe(
      `Basic ${Buffer.from('foo:bar').toString('base64')}`,
    );
  });

  it('falls back to credentials embedded in api_url', () => {
    const cfg = mapArxivarRecord({
      api_url: 'http://u:p@host:8883/MyMB/Service/web',
    });
    expect(cfg.baseUrl).toBe('http://host:8883/MyMB/Service/web');
    expect(cfg.authHeader).toBe(
      `Basic ${Buffer.from('u:p').toString('base64')}`,
    );
  });

  it('defaults enabled to true when absent and honours enabled=false', () => {
    expect(mapArxivarRecord({ api_url: 'http://host/x' }).enabled).toBe(true);
    expect(
      mapArxivarRecord({ enabled: false, api_url: 'http://host/x' }).enabled,
    ).toBe(false);
  });
});
