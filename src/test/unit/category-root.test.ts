import { describe, it, expect } from 'vitest';
import {
  parseCategoryRootEnv,
  categoryRootFor,
  decideCategoryRouting,
  DEFAULT_CATEGORY_ROOT,
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
