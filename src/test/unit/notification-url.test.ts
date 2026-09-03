import { describe, it, expect } from 'vitest';
import { resolveNotificationUrl } from '@/lib/notifications/notification-url';

/**
 * Campaign destinations are free text typed into the Suite's campaign form and
 * shipped verbatim (`action_url: content.products_url || content.url`). A bare
 * relative one resolves against whatever page the reader happens to be on, so
 * the same notification lands on `/it/search?…` from the home page and on
 * `/it/account/search?…` — a 404 — from the account area.
 */
describe('resolveNotificationUrl', () => {
  it('localizes the bare relative URL campaigns are authored with', () => {
    expect(
      resolveNotificationUrl('search?filters-promo_code=26-SUMMER', 'it'),
    ).toBe('/it/search?filters-promo_code=26-SUMMER');
  });

  it('localizes a root-relative URL', () => {
    expect(resolveNotificationUrl('/search?text=guanti', 'it')).toBe(
      '/it/search?text=guanti',
    );
  });

  it('leaves an already-localized URL alone', () => {
    expect(resolveNotificationUrl('/it/search?text=guanti', 'it')).toBe(
      '/it/search?text=guanti',
    );
    expect(resolveNotificationUrl('/it', 'it')).toBe('/it');
  });

  it('does not re-localize a URL aimed at another language', () => {
    expect(resolveNotificationUrl('/en/search?text=gloves', 'it')).toBe(
      '/en/search?text=gloves',
    );
  });

  it('treats a bare path that already starts with a language as localized', () => {
    expect(resolveNotificationUrl('it/search?text=guanti', 'it')).toBe(
      '/it/search?text=guanti',
    );
  });

  it('leaves absolute and non-http destinations alone', () => {
    for (const url of [
      'https://b2b.example.com/it/search?filters-promo_code=26-SUMMER',
      'http://example.com/promo',
      '//cdn.example.com/catalogo.pdf',
      'mailto:info@example.com',
      'tel:+390000000',
    ]) {
      expect(resolveNotificationUrl(url, 'it')).toBe(url);
    }
  });

  it('refuses script-bearing destinations', () => {
    for (const url of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ]) {
      expect(resolveNotificationUrl(url, 'it')).toBeNull();
    }
  });

  it('is null for nothing to navigate to', () => {
    expect(resolveNotificationUrl(undefined, 'it')).toBeNull();
    expect(resolveNotificationUrl(null, 'it')).toBeNull();
    expect(resolveNotificationUrl('', 'it')).toBeNull();
    expect(resolveNotificationUrl('   ', 'it')).toBeNull();
  });

  it('keeps hash and query fragments intact', () => {
    expect(resolveNotificationUrl('search?a=1&b=2#top', 'it')).toBe(
      '/it/search?a=1&b=2#top',
    );
  });
});
