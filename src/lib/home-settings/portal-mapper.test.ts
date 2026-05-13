import { describe, it, expect } from 'vitest';
import {
  mapPortalToHomeSettings,
  mapFooter,
} from '@/lib/home-settings/portal-mapper';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';

describe('mapPortalToHomeSettings', () => {
  it('returns defaults when portal is undefined', () => {
    expect(mapPortalToHomeSettings(undefined)).toBe(DEFAULT_HOME_SETTINGS);
  });

  it('maps branding snake_case → camelCase, falling back to defaults', () => {
    const hs = mapPortalToHomeSettings({
      name: 'Acme S.r.l.',
      branding: {
        title: 'Acme',
        logo_url: 'https://cdn/logo.png',
        primary_color: '#ff0000',
        accent_color: '#0000ff',
      },
    });
    expect(hs.companyName).toBe('Acme S.r.l.');
    expect(hs.branding.title).toBe('Acme');
    expect(hs.branding.logo).toBe('https://cdn/logo.png');
    expect(hs.branding.primaryColor).toBe('#ff0000');
    expect(hs.branding.accentColor).toBe('#0000ff');
    // Untouched extended colors keep their defaults
    expect(hs.branding.footerBackgroundColor).toBe(
      DEFAULT_HOME_SETTINGS.branding.footerBackgroundColor,
    );
    // Card style still comes from defaults (portal endpoint doesn't carry it)
    expect(hs.cardStyle).toEqual(DEFAULT_HOME_SETTINGS.cardStyle);
  });

  it('maps a structured footer with mixed items', () => {
    const hs = mapPortalToHomeSettings({
      footer: {
        bg_color: '#101820',
        text_color: '#ccc',
        copyright_text: '© 2026 Acme',
        show_newsletter: true,
        newsletter_heading: 'Join us',
        newsletter_placeholder: 'you@acme.com',
        social_links: [
          { platform: 'facebook', url: 'https://fb/acme' },
          { platform: '', url: 'https://nope' }, // dropped — no platform
        ],
        columns: [
          {
            title: 'Company',
            items: [
              { type: 'text', text_content: '<b>About</b>' },
              {
                type: 'link',
                label: 'Contact',
                href: '/contact',
                open_in_new_tab: false,
              },
              {
                type: 'image',
                image_url: 'https://cdn/i.png',
                image_alt: 'logo',
                image_max_width: 120,
              },
              { type: 'bogus' } as any, // dropped — unknown type
            ],
            links: [{ label: 'ignored-when-items', href: '/x' }],
          },
          {
            title: 'Legacy',
            links: [
              { label: 'Terms', href: '/terms' },
              { href: 'https://ext/privacy', open_in_new_tab: true },
            ],
          },
        ],
      },
    });
    const f = hs.footer!;
    expect(f.bgColor).toBe('#101820');
    expect(f.textColor).toBe('#ccc');
    expect(f.copyrightText).toBe('© 2026 Acme');
    expect(f.showNewsletter).toBe(true);
    expect(f.newsletterHeading).toBe('Join us');
    expect(f.socialLinks).toEqual([
      { platform: 'facebook', url: 'https://fb/acme' },
    ]);

    const company = f.columns![0];
    expect(company.items).toHaveLength(3); // bogus dropped
    expect(company.items![0]).toMatchObject({
      type: 'text',
      textContent: '<b>About</b>',
    });
    expect(company.items![1]).toMatchObject({
      type: 'link',
      label: 'Contact',
      href: '/contact',
    });
    expect(company.items![2]).toMatchObject({
      type: 'image',
      imageUrl: 'https://cdn/i.png',
      imageMaxWidth: 120,
    });

    const legacy = f.columns![1];
    expect(legacy.items).toBeUndefined();
    expect(legacy.links).toEqual([
      { label: 'Terms', href: '/terms', openInNewTab: undefined },
      { label: '', href: 'https://ext/privacy', openInNewTab: true },
    ]);
  });

  it('falls back footer to DEFAULT_HOME_SETTINGS.footer when portal has no footer', () => {
    const hs = mapPortalToHomeSettings({ branding: { title: 'X' } });
    expect(hs.footer).toBe(DEFAULT_HOME_SETTINGS.footer);
  });

  it('keeps legacy footerHtml populated from portal.footer.footer_html', () => {
    const hs = mapPortalToHomeSettings({
      footer: { footer_html: '<footer>raw</footer>' },
    });
    expect(hs.footerHtml).toBe('<footer>raw</footer>');
    expect(hs.footer!.footerHtml).toBe('<footer>raw</footer>');
  });
});

describe('mapFooter', () => {
  it('returns undefined for undefined input', () => {
    expect(mapFooter(undefined)).toBeUndefined();
  });

  it('returns empty arrays when columns/social are absent', () => {
    expect(mapFooter({})).toMatchObject({ columns: [], socialLinks: [] });
  });
});
