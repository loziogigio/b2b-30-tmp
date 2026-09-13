import { describe, it, expect } from 'vitest';
import { sanitizePortalHtml, sanitizeHtml } from '@/lib/sanitize-html';

// Admin-authored portal HTML (footer "HTML" mode) is written by the same
// tenant admin who can already inject raw site-wide CSS and scripts, so it
// may carry its own <style> and stylesheet <link>s — the default sanitizer
// (product descriptions, CMS blocks) must keep stripping them.
describe('sanitizePortalHtml', () => {
  it('keeps <style> blocks and their CSS verbatim', () => {
    const html = '<style>.social-icons a:hover{color:#fff}</style><p>x</p>';
    expect(sanitizePortalHtml(html)).toContain(
      '<style>.social-icons a:hover{color:#fff}</style>',
    );
    expect(sanitizeHtml(html)).not.toContain('<style');
  });

  it('keeps stylesheet <link>s (icon fonts) but no other kind of <link>', () => {
    const css =
      '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">';
    const preload = '<link rel="preload" href="https://x/e.js" as="script">';
    const out = sanitizePortalHtml(css + preload);
    expect(out).toContain('font-awesome/6.4.0/css/all.min.css');
    expect(out).toContain('rel="stylesheet"');
    expect(out).not.toContain('preload');
    expect(sanitizeHtml(css)).not.toContain('<link');
  });

  it('keeps icon-font placeholders and inline styles', () => {
    const out = sanitizePortalHtml(
      '<div class="social-icons" style="display:flex"><a href="https://fb.com/x" target="_blank" rel="noopener noreferrer"><i class="fab fa-facebook-f"></i></a></div>',
    );
    expect(out).toContain('<i class="fab fa-facebook-f"></i>');
    expect(out).toContain('style="display:flex"');
  });

  it('still strips scripts, event handlers and javascript: URLs', () => {
    const out = sanitizePortalHtml(
      '<script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">a</a><img src="x" onerror="y()">',
    );
    expect(out).not.toContain('<script');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('javascript:');
  });
});
