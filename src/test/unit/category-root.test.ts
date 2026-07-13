import { describe, it, expect } from 'vitest';
import {
  parseCategoryRootEnv,
  categoryRootFor,
  decideCategoryRouting,
  DEFAULT_CATEGORY_ROOT,
  categoryDetailHref,
  categoryMenuHref,
  normalizeCategoryRootMap,
} from '@/lib/seo/category-root';

describe('parseCategoryRootEnv', () => {
  it('defaults to categorie for empty/undefined', () => {
    expect(parseCategoryRootEnv(undefined)).toEqual({ default: 'categorie' });
    expect(parseCategoryRootEnv('')).toEqual({ default: 'categorie' });
    expect(parseCategoryRootEnv('   ')).toEqual({ default: 'categorie' });
  });
  it('treats a bare string as the default root', () => {
    expect(parseCategoryRootEnv('prodotti')).toEqual({ default: 'prodotti' });
  });
  it('parses a per-locale JSON map and forces a default', () => {
    expect(parseCategoryRootEnv('{"it":"prodotti","en":"products"}')).toEqual({
      default: 'categorie',
      it: 'prodotti',
      en: 'products',
    });
  });
  it('falls back to default on malformed JSON', () => {
    expect(parseCategoryRootEnv('{bad json')).toEqual({ default: 'categorie' });
    expect(parseCategoryRootEnv('../products')).toEqual({
      default: 'categorie',
    });
  });
});

describe('normalizeCategoryRootMap', () => {
  it('keeps valid localized segments and rejects paths or fragments', () => {
    expect(
      normalizeCategoryRootMap({
        default: 'gruppi',
        it: 'prodotti-industriali',
        en: 'products/all',
        fr: 'produits?draft=1',
      }),
    ).toEqual({ default: 'gruppi', it: 'prodotti-industriali' });
  });
});

describe('categoryRootFor', () => {
  const map = { default: 'categorie', it: 'prodotti' };
  it('prefers locale, then default, then categorie', () => {
    expect(categoryRootFor(map, 'it')).toBe('prodotti');
    expect(categoryRootFor(map, 'en')).toBe('categorie');
    expect(categoryRootFor({ default: '' } as any, 'it')).toBe(
      DEFAULT_CATEGORY_ROOT,
    );
  });
});

describe('categoryDetailHref', () => {
  it('builds root and nested category links with the public root', () => {
    expect(categoryDetailHref('it', [], 'prodotti')).toBe('/it/prodotti');
    expect(
      categoryDetailHref('it', ['illuminazione', 'lampade led'], 'prodotti'),
    ).toBe('/it/prodotti/illuminazione/lampade%20led');
  });
});

describe('categoryMenuHref', () => {
  it('canonicalizes legacy PIM category URLs to the configured root', () => {
    expect(
      categoryMenuHref(
        'it',
        ['valvolame', 'valvole'],
        'prodotti',
        '/categorie/valvolame/valvole?view=grid',
      ),
    ).toBe('/it/prodotti/valvolame/valvole?view=grid');
    expect(
      categoryMenuHref(
        'it',
        ['valvolame'],
        'prodotti',
        '/it/categorie/valvolame',
      ),
    ).toBe('/it/prodotti/valvolame');
  });

  it('uses the category path fallback and preserves unrelated destinations', () => {
    expect(categoryMenuHref('it', ['valvolame'], 'prodotti')).toBe(
      '/it/prodotti/valvolame',
    );
    expect(
      categoryMenuHref('it', ['ignored'], 'prodotti', '/search?q=valvole'),
    ).toBe('/it/search?q=valvole');
    expect(
      categoryMenuHref(
        'it',
        ['ignored'],
        'prodotti',
        'https://docs.example.com/catalogue',
      ),
    ).toBe('https://docs.example.com/catalogue');
  });

  it('rejects executable or unknown URL schemes from authored menu data', () => {
    expect(
      categoryMenuHref('it', ['valvolame'], 'prodotti', 'javascript:alert(1)'),
    ).toBe('/it/prodotti/valvolame');
    expect(
      categoryMenuHref('it', ['valvolame'], 'prodotti', 'data:text/html,x'),
    ).toBe('/it/prodotti/valvolame');
  });
});

describe('decideCategoryRouting', () => {
  const map = { default: 'categorie', it: 'prodotti', en: 'products' };

  it('rewrites the public root to the internal categorie route', () => {
    expect(decideCategoryRouting('/it/prodotti/bagno', map)).toEqual({
      rewriteTo: '/it/categorie/bagno',
    });
    expect(decideCategoryRouting('/en/products/kitchen/sinks', map)).toEqual({
      rewriteTo: '/en/categorie/kitchen/sinks',
    });
  });

  it('rewrites the bare public root (no tail)', () => {
    expect(decideCategoryRouting('/it/prodotti', map)).toEqual({
      rewriteTo: '/it/categorie',
    });
  });

  it('301-redirects legacy /categorie to the configured root', () => {
    expect(decideCategoryRouting('/it/categorie/bagno', map)).toEqual({
      redirectTo: '/it/prodotti/bagno',
    });
    expect(decideCategoryRouting('/it/categorie', map)).toEqual({
      redirectTo: '/it/prodotti',
    });
  });

  it('matches encoded Unicode roots and preserves encoded descendant slugs', () => {
    const unicode = { default: 'categorie', it: 'caffè' };
    expect(
      decideCategoryRouting('/it/caff%C3%A8/lampade%20led', unicode),
    ).toEqual({ rewriteTo: '/it/categorie/lampade%20led' });
    expect(
      decideCategoryRouting('/it/categorie/lampade%20led', unicode),
    ).toEqual({ redirectTo: '/it/caff%C3%A8/lampade%20led' });
  });

  it('is a no-op for locales whose root is the default categorie', () => {
    // 'de' has no override → root stays 'categorie' → nothing to do
    expect(decideCategoryRouting('/de/categorie/bagno', map)).toEqual({});
    expect(decideCategoryRouting('/de/prodotti/bagno', map)).toEqual({});
  });

  it('is a no-op when the whole tenant uses the default root', () => {
    const def = { default: 'categorie' };
    expect(decideCategoryRouting('/it/categorie/bagno', def)).toEqual({});
    expect(decideCategoryRouting('/it/prodotti/bagno', def)).toEqual({});
  });

  it('ignores unrelated paths', () => {
    expect(decideCategoryRouting('/it/products/SKU123', map)).toEqual({});
    expect(decideCategoryRouting('/it/some-slug', map)).toEqual({});
    expect(decideCategoryRouting('/it', map)).toEqual({});
    expect(decideCategoryRouting('/', map)).toEqual({});
  });
});
