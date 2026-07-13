import { describe, expect, it } from 'vitest';
import {
  absoluteProductDetailUrl,
  localizedProductSlug,
  productDetailHref,
} from '@/lib/seo/product-url';

describe('product detail URLs', () => {
  it('prefers an already-localized product slug', () => {
    expect(productDetailHref('it', { slug: 'lampada-led', sku: 'SKU-1' })).toBe(
      '/it/lampada-led',
    );
  });

  it('selects the requested locale from a multilingual PIM slug', () => {
    const slug = { it: 'lampada-led', en: 'led-lamp' };
    expect(productDetailHref('it', { slug, sku: 'SKU-1' })).toBe(
      '/it/lampada-led',
    );
    expect(productDetailHref('en', { slug, sku: 'SKU-1' })).toBe(
      '/en/led-lamp',
    );
    expect(localizedProductSlug(slug, 'it-IT')).toBe('lampada-led');
  });

  it('falls back to SKU instead of borrowing another locale slug', () => {
    expect(
      productDetailHref('de', {
        slug: { it: 'lampada-led' },
        sku: 'PO 27/011',
      }),
    ).toBe('/de/PO%2027%2F011');
  });

  it('returns null when neither locale nor product identity is usable', () => {
    expect(productDetailHref('', { slug: 'lampada' })).toBeNull();
    expect(productDetailHref('it', { slug: ' ', sku: '' })).toBeNull();
  });

  it('builds an absolute canonical without duplicate slashes', () => {
    expect(
      absoluteProductDetailUrl('https://shop.example.com/', 'it', {
        slug: { it: 'lampada-led' },
        sku: 'SKU-1',
      }),
    ).toBe('https://shop.example.com/it/lampada-led');
  });
});
