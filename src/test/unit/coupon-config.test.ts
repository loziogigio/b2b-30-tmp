import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveCouponConfigFromEnv, mapCouponRecord, DEFAULT_COUPON_CONFIG, fetchCouponSettings } from '@/lib/erp/coupon-config';

describe('coupon-config (static)', () => {
  const OLD = { ...process.env };
  beforeEach(() => { delete process.env.COUPON_API_URL; delete process.env.COUPON_API_USER; delete process.env.COUPON_API_PASSWORD; });
  afterEach(() => { process.env = { ...OLD }; });

  it('parses embedded credentials from COUPON_API_URL', () => {
    process.env.COUPON_API_URL = 'http://U:P@mymb:8884/MyMB/Service/web';
    const cfg = resolveCouponConfigFromEnv();
    expect(cfg.enabled).toBe(true);
    expect(cfg.baseUrl).toBe('http://mymb:8884/MyMB/Service/web');
    expect(cfg.authHeader).toBe('Basic ' + Buffer.from('U:P').toString('base64'));
  });

  it('uses COUPON_API_USER/PASSWORD when the URL has no creds', () => {
    process.env.COUPON_API_URL = 'http://mymb:8884/MyMB/Service/web';
    process.env.COUPON_API_USER = 'U';
    process.env.COUPON_API_PASSWORD = 'P';
    const cfg = resolveCouponConfigFromEnv();
    expect(cfg.baseUrl).toBe('http://mymb:8884/MyMB/Service/web');
    expect(cfg.authHeader).toBe('Basic ' + Buffer.from('U:P').toString('base64'));
  });

  it('falls back to DEFAULT_COUPON_CONFIG (still enabled, empty url) when env is absent', () => {
    expect(resolveCouponConfigFromEnv()).toEqual(DEFAULT_COUPON_CONFIG);
  });

  it('mapCouponRecord builds config from a data-model record + env creds', () => {
    process.env.COUPON_API_USER = 'U';
    process.env.COUPON_API_PASSWORD = 'P';
    const cfg = mapCouponRecord({ enabled: false, api_url: 'http://mymb:8884/MyMB/Service/web' });
    expect(cfg.enabled).toBe(false);
    expect(cfg.baseUrl).toBe('http://mymb:8884/MyMB/Service/web');
    expect(cfg.authHeader).toBe('Basic ' + Buffer.from('U:P').toString('base64'));
  });
});

describe('coupon-config (dynamic)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('maps a coupon_settings record from CS', async () => {
    process.env.COUPON_API_USER = 'U'; process.env.COUPON_API_PASSWORD = 'P';
    global.fetch = (async () => new Response(JSON.stringify({
      data: { items: [{ data: { enabled: true, api_url: 'http://mymb:8884/MyMB/Service/web' } }] },
    }), { status: 200 })) as any;
    const cfg = await fetchCouponSettings({ csBaseUrl: 'http://cs', apiKeyId: 'k', apiSecret: 's', channel: 'b2b' });
    expect(cfg.baseUrl).toBe('http://mymb:8884/MyMB/Service/web');
    expect(cfg.enabled).toBe(true);
  });

  it('falls back to default when the record is absent', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ data: { items: [] } }), { status: 200 })) as any;
    const cfg = await fetchCouponSettings({ csBaseUrl: 'http://cs', apiKeyId: 'k', apiSecret: 's', channel: 'b2b' });
    expect(cfg).toEqual(DEFAULT_COUPON_CONFIG);
  });
});
