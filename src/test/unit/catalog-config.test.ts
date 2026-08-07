import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveCatalogConfigFromEnv,
  mapCatalogRecord,
  DEFAULT_CATALOG_CONFIG,
  fetchCatalogSettings,
} from '@/lib/erp/catalog-config';

describe('catalog-config (static)', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    delete process.env.CATALOG_DEFAULT_VIEW;
    delete process.env.CATALOG_PRODUCT_OPEN_MODE;
    delete process.env.CATALOG_AVAILABILITY_DISPLAY;
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('defaults to grid + modal + in_out availability when env is absent', () => {
    expect(resolveCatalogConfigFromEnv()).toEqual(DEFAULT_CATALOG_CONFIG);
    expect(DEFAULT_CATALOG_CONFIG).toEqual({
      defaultView: 'grid',
      productOpenMode: 'modal',
      availabilityDisplay: 'in_out',
      arrivalDisplay: 'week',
    });
  });

  it('reads valid env enum values', () => {
    process.env.CATALOG_DEFAULT_VIEW = 'list';
    process.env.CATALOG_PRODUCT_OPEN_MODE = 'detail_page';
    process.env.CATALOG_AVAILABILITY_DISPLAY = 'exact';
    expect(resolveCatalogConfigFromEnv()).toEqual({
      defaultView: 'list',
      productOpenMode: 'detail_page',
      availabilityDisplay: 'exact',
      arrivalDisplay: 'week',
    });
  });

  it('coerces unknown env values back to defaults', () => {
    process.env.CATALOG_DEFAULT_VIEW = 'carousel';
    process.env.CATALOG_PRODUCT_OPEN_MODE = 'popover';
    process.env.CATALOG_AVAILABILITY_DISPLAY = 'fuzzy';
    expect(resolveCatalogConfigFromEnv()).toEqual(DEFAULT_CATALOG_CONFIG);
  });

  it('mapCatalogRecord maps valid record enums', () => {
    expect(
      mapCatalogRecord({
        default_view: 'list',
        product_open_mode: 'detail_page',
        availability_display: 'exact',
      }),
    ).toEqual({
      defaultView: 'list',
      productOpenMode: 'detail_page',
      availabilityDisplay: 'exact',
      arrivalDisplay: 'week',
    });
  });

  it('mapCatalogRecord reads arrival_display, defaulting to week', () => {
    // `week` is the default because a supplier date only supports that
    // granularity — an exact day reads as a promise the ERP cannot keep.
    expect(mapCatalogRecord({ arrival_display: 'date' }).arrivalDisplay).toBe(
      'date',
    );
    expect(mapCatalogRecord({ arrival_display: 'week' }).arrivalDisplay).toBe(
      'week',
    );
    expect(mapCatalogRecord({}).arrivalDisplay).toBe('week');
    expect(
      mapCatalogRecord({ arrival_display: 'nonsense' }).arrivalDisplay,
    ).toBe('week');
  });

  it('mapCatalogRecord defaults unknown/missing fields', () => {
    expect(mapCatalogRecord({ default_view: 'nope' })).toEqual(
      DEFAULT_CATALOG_CONFIG,
    );
    expect(mapCatalogRecord({})).toEqual(DEFAULT_CATALOG_CONFIG);
  });
});

describe('catalog-config (dynamic)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('maps a catalog_settings record from CS (availability defaults to in_out)', async () => {
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                data: {
                  default_view: 'list',
                  product_open_mode: 'detail_page',
                },
              },
            ],
          },
        }),
        { status: 200 },
      )) as any;
    const cfg = await fetchCatalogSettings({
      csBaseUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
      channel: 'b2b',
    });
    expect(cfg).toEqual({
      defaultView: 'list',
      productOpenMode: 'detail_page',
      availabilityDisplay: 'in_out',
      arrivalDisplay: 'week',
    });
  });

  it('maps availability_display: exact from a CS record', async () => {
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                data: {
                  default_view: 'grid',
                  product_open_mode: 'modal',
                  availability_display: 'exact',
                },
              },
            ],
          },
        }),
        { status: 200 },
      )) as any;
    const cfg = await fetchCatalogSettings({
      csBaseUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
      channel: 'b2b',
    });
    expect(cfg).toEqual({
      defaultView: 'grid',
      productOpenMode: 'modal',
      availabilityDisplay: 'exact',
      arrivalDisplay: 'week',
    });
  });

  /**
   * Must be null, NOT DEFAULT_CATALOG_CONFIG. resolveCatalogConfig does
   * `dyn ?? envCfg`, so returning a truthy defaults object here would swallow
   * the `??` and silently kill the env fallback whenever Commerce Suite is
   * reachable but carries no record — which made CATALOG_AVAILABILITY_DISPLAY
   * do nothing. Precedence must be: record → env → defaults.
   */
  it('returns null when the record is absent, so the env fallback can apply', async () => {
    global.fetch = (async () =>
      new Response(JSON.stringify({ data: { items: [] } }), {
        status: 200,
      })) as any;
    const cfg = await fetchCatalogSettings({
      csBaseUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
      channel: 'b2b',
    });
    expect(cfg).toBeNull();
  });

  it('returns null on a non-OK response, so the env fallback can apply', async () => {
    global.fetch = (async () => new Response('nope', { status: 500 })) as any;
    const cfg = await fetchCatalogSettings({
      csBaseUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
      channel: 'b2b',
    });
    expect(cfg).toBeNull();
  });

  it('returns null when Commerce Suite is unreachable', async () => {
    global.fetch = (async () => {
      throw new Error('ENOTFOUND vinc-cs');
    }) as any;
    const cfg = await fetchCatalogSettings({
      csBaseUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
      channel: 'b2b',
    });
    expect(cfg).toBeNull();
  });
});
