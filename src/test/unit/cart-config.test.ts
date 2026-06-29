import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveCartConfigFromEnv,
  mapCartRecord,
  DEFAULT_CART_CONFIG,
  fetchCartSettings,
} from '@/lib/erp/cart-config';

describe('cart-config (static)', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    delete process.env.CART_SHOW_LINE_NOTE;
    delete process.env.CART_SHOW_HEAD_NOTE;
    delete process.env.CART_SHOW_PICKUP;
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('defaults notes off and pickup on when env is absent', () => {
    expect(resolveCartConfigFromEnv()).toEqual(DEFAULT_CART_CONFIG);
    expect(DEFAULT_CART_CONFIG).toEqual({
      showLineNote: false,
      showHeadNote: false,
      showPickup: true,
    });
  });

  it('reads truthy env values ("true"/"1") as enabled', () => {
    process.env.CART_SHOW_LINE_NOTE = 'true';
    process.env.CART_SHOW_HEAD_NOTE = '1';
    expect(resolveCartConfigFromEnv()).toEqual({
      showLineNote: true,
      showHeadNote: true,
      showPickup: true,
    });
  });

  it('treats other env values as off', () => {
    process.env.CART_SHOW_LINE_NOTE = 'false';
    process.env.CART_SHOW_HEAD_NOTE = '0';
    expect(resolveCartConfigFromEnv()).toEqual({
      showLineNote: false,
      showHeadNote: false,
      showPickup: true,
    });
  });

  it('lets CART_SHOW_PICKUP=false hide pickup', () => {
    process.env.CART_SHOW_PICKUP = 'false';
    expect(resolveCartConfigFromEnv().showPickup).toBe(false);
  });

  it('mapCartRecord maps boolean record fields', () => {
    expect(
      mapCartRecord({
        show_line_note: true,
        show_head_note: false,
        show_pickup: false,
      }),
    ).toEqual({
      showLineNote: true,
      showHeadNote: false,
      showPickup: false,
    });
  });

  it('mapCartRecord coerces loose values, notes default off, pickup defaults on', () => {
    expect(mapCartRecord({ show_line_note: 'true' })).toEqual({
      showLineNote: true,
      showHeadNote: false,
      showPickup: true,
    });
    expect(mapCartRecord({})).toEqual(DEFAULT_CART_CONFIG);
  });
});

describe('cart-config (dynamic)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('maps a cart_settings record from CS', async () => {
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: { items: [{ data: { show_line_note: true, show_head_note: true } }] },
        }),
        { status: 200 },
      )) as any;
    const cfg = await fetchCartSettings({
      csBaseUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
      channel: 'b2b',
    });
    expect(cfg).toEqual({
      showLineNote: true,
      showHeadNote: true,
      showPickup: true,
    });
  });

  it('falls back to default when the record is absent', async () => {
    global.fetch = (async () =>
      new Response(JSON.stringify({ data: { items: [] } }), { status: 200 })) as any;
    const cfg = await fetchCartSettings({
      csBaseUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
      channel: 'b2b',
    });
    expect(cfg).toEqual(DEFAULT_CART_CONFIG);
  });

  it('falls back to default on a non-OK response', async () => {
    global.fetch = (async () => new Response('nope', { status: 500 })) as any;
    const cfg = await fetchCartSettings({
      csBaseUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
      channel: 'b2b',
    });
    expect(cfg).toEqual(DEFAULT_CART_CONFIG);
  });
});
