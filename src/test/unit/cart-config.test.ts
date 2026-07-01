import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveCartConfigFromEnv,
  mapCartRecord,
  DEFAULT_CART_CONFIG,
  fetchCartSettings,
} from '@/lib/erp/cart-config';
import {
  asOrderSuccessPages,
  resolveOrderSuccessSlug,
} from '@/lib/erp/cart-config.types';

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
      orderSuccessPages: [],
    });
  });

  it('reads truthy env values ("true"/"1") as enabled', () => {
    process.env.CART_SHOW_LINE_NOTE = 'true';
    process.env.CART_SHOW_HEAD_NOTE = '1';
    expect(resolveCartConfigFromEnv()).toEqual({
      showLineNote: true,
      showHeadNote: true,
      showPickup: true,
      orderSuccessPages: [],
    });
  });

  it('treats other env values as off', () => {
    process.env.CART_SHOW_LINE_NOTE = 'false';
    process.env.CART_SHOW_HEAD_NOTE = '0';
    expect(resolveCartConfigFromEnv()).toEqual({
      showLineNote: false,
      showHeadNote: false,
      showPickup: true,
      orderSuccessPages: [],
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
      orderSuccessPages: [],
    });
  });

  it('mapCartRecord coerces loose values, notes default off, pickup defaults on', () => {
    expect(mapCartRecord({ show_line_note: 'true' })).toEqual({
      showLineNote: true,
      showHeadNote: false,
      showPickup: true,
      orderSuccessPages: [],
    });
    expect(mapCartRecord({})).toEqual(DEFAULT_CART_CONFIG);
  });

  it('mapCartRecord maps order_success_pages (array_of_objects)', () => {
    const cfg = mapCartRecord({
      order_success_pages: [
        { lang: 'IT', slug: ' ordine-ricevuto ' },
        { lang: 'en', slug: 'order-received' },
        { lang: 'fr', slug: '' }, // dropped: empty slug
        { slug: 'no-lang' }, // dropped: no lang
      ],
    });
    expect(cfg.orderSuccessPages).toEqual([
      { lang: 'it', slug: 'ordine-ricevuto' },
      { lang: 'en', slug: 'order-received' },
    ]);
  });
});

describe('order-success redirect helpers', () => {
  it('asOrderSuccessPages keeps only valid {lang,slug}, trims + lowercases lang', () => {
    expect(
      asOrderSuccessPages([
        { lang: 'DE', slug: 'bestellung-erhalten' },
        { lang: '', slug: 'x' },
        { lang: 'es' },
        'garbage',
        null,
      ]),
    ).toEqual([{ lang: 'de', slug: 'bestellung-erhalten' }]);
    expect(asOrderSuccessPages(undefined)).toEqual([]);
    expect(asOrderSuccessPages('nope' as unknown)).toEqual([]);
  });

  it('resolveOrderSuccessSlug returns the slug for the language, else undefined', () => {
    const pages = [
      { lang: 'it', slug: 'ordine-ricevuto' },
      { lang: 'en', slug: 'order-received' },
    ];
    expect(resolveOrderSuccessSlug('it', pages)).toBe('ordine-ricevuto');
    expect(resolveOrderSuccessSlug('EN', pages)).toBe('order-received');
    expect(resolveOrderSuccessSlug('fr', pages)).toBeUndefined();
    expect(resolveOrderSuccessSlug('it', [])).toBeUndefined();
    expect(resolveOrderSuccessSlug('it', undefined)).toBeUndefined();
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
          data: {
            items: [{ data: { show_line_note: true, show_head_note: true } }],
          },
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
      orderSuccessPages: [],
    });
  });

  it('falls back to default when the record is absent', async () => {
    global.fetch = (async () =>
      new Response(JSON.stringify({ data: { items: [] } }), {
        status: 200,
      })) as any;
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
