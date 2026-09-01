import { describe, it, expect, vi, afterEach } from 'vitest';
import { warnIfRedirectDroppedAuth } from '@/lib/tenant/auth-redirect-warning';

/** Minimal stand-in for the parts of Response the helper reads. */
function res(url: string, redirected: boolean) {
  return { url, redirected } as Response;
}

afterEach(() => vi.restoreAllMocks());

describe('unit: warnIfRedirectDroppedAuth', () => {
  it('warns when a cross-origin redirect followed a request that carried auth', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dropped = warnIfRedirectDroppedAuth(
      res('https://cs.vendereincloud.it/api/search/search', true),
      'http://cs.vendereincloud.it/api/search/search',
      true,
    );
    expect(dropped).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    // The message must name both ends, or it is useless in a log.
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain('http://cs.vendereincloud.it');
    expect(msg).toContain('https://cs.vendereincloud.it');
  });

  it('stays silent when no Authorization header was sent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      warnIfRedirectDroppedAuth(
        res('https://cs.vendereincloud.it/x', true),
        'http://cs.vendereincloud.it/x',
        false,
      ),
    ).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('stays silent when there was no redirect', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      warnIfRedirectDroppedAuth(
        res('http://vinc-cs:3000/api/search/search', false),
        'http://vinc-cs:3000/api/search/search',
        true,
      ),
    ).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('stays silent for a same-origin redirect, which keeps the header', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      warnIfRedirectDroppedAuth(
        res('https://cs.vendereincloud.it/api/search/search/', true),
        'https://cs.vendereincloud.it/api/search/search',
        true,
      ),
    ).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not throw on an unparseable url', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      warnIfRedirectDroppedAuth(res('', true), 'not a url', true),
    ).not.toThrow();
  });
});
