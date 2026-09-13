import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('@components/ui/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const settings: any = {
  branding: { title: 'ACME' },
  footer: {
    columns: [],
    socialLinks: [],
    copyrightText: '© ACME | P.I. 00000000000',
    footerHtml:
      '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">' +
      '<div class="social-icons"><a href="https://fb.com/acme"><i class="fab fa-facebook-f"></i></a></div>' +
      '<style>.social-icons a{border-radius:50%}</style>',
  },
};
vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings }),
}));

import SiteFooter from '@/layouts/footer/site-footer';

describe('SiteFooter — HTML mode', () => {
  it('renders the copyright bar under the custom HTML, like the CS preview', () => {
    const { container } = render(<SiteFooter lang="it" />);
    expect(container.querySelector('.site-footer--html')).not.toBeNull();
    expect(screen.getByText('© ACME | P.I. 00000000000')).toBeInTheDocument();
  });

  it('keeps the icon-font stylesheet and <style> the admin wrote', () => {
    const { container } = render(<SiteFooter lang="it" />);
    const html = container.querySelector('.site-footer__html')!.innerHTML;
    expect(html).toContain('font-awesome/6.4.0/css/all.min.css');
    expect(html).toContain('<style>.social-icons a{border-radius:50%}</style>');
    expect(html).toContain('<i class="fab fa-facebook-f"></i>');
  });
});
