import { describe, it, expect } from 'vitest';
import { buildNavKey } from '@components/common/search-b2b';

/**
 * `buildNavKey` decides whether a URL change is a real navigation (overlay must
 * close) or just the search overlay mutating its own state (overlay stays open).
 * A change in the returned key === navigated away.
 */
describe('buildNavKey', () => {
  const sp = (q: string) => new URLSearchParams(q);

  it('treats product → product (sku change, same path) as navigation', () => {
    const before = buildNavKey('/it/products', sp('sku=ABC'));
    const after = buildNavKey('/it/products', sp('sku=DIANAL'));
    expect(before).not.toBe(after);
  });

  it('treats arriving on a product page (sku appears) as navigation', () => {
    const before = buildNavKey('/it/products', sp(''));
    const after = buildNavKey('/it/products', sp('sku=DIANAL'));
    expect(before).not.toBe(after);
  });

  it('ignores the overlay typing in `text` (stays open)', () => {
    const before = buildNavKey('/it/search', sp('text=lav'));
    const after = buildNavKey('/it/search', sp('text=lavabo'));
    expect(before).toBe(after);
  });

  it('ignores in-overlay facet filters (`filters-*`) (stays open)', () => {
    const before = buildNavKey('/it/search', sp('text=lavabo'));
    const after = buildNavKey(
      '/it/search',
      sp('text=lavabo&filters-brand=GEBERIT&filters-gruppo=Bagno'),
    );
    expect(before).toBe(after);
  });

  it('still detects a real path change (e.g. search → category)', () => {
    const before = buildNavKey('/it/search', sp('text=lavabo'));
    const after = buildNavKey('/it/categorie/bagno', sp(''));
    expect(before).not.toBe(after);
  });

  it('detects non-search query params changing alongside ignored ones', () => {
    const before = buildNavKey('/it/products', sp('sku=ABC&filters-x=1'));
    const after = buildNavKey('/it/products', sp('sku=ABC&filters-x=2'));
    expect(before).toBe(after); // only a filter changed → not a navigation
    const after2 = buildNavKey('/it/products', sp('sku=XYZ&filters-x=1'));
    expect(before).not.toBe(after2); // sku changed → navigation
  });

  it('is stable regardless of query param ordering', () => {
    const a = buildNavKey('/it/products', sp('sku=ABC&page=2'));
    const b = buildNavKey('/it/products', sp('page=2&sku=ABC'));
    expect(a).toBe(b);
  });

  it('handles null inputs without throwing', () => {
    expect(buildNavKey(null, null)).toBe('');
    expect(buildNavKey('/it/products', null)).toBe('/it/products');
  });
});
