import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// next/image needs a configured loader/domain at runtime — render a plain <img>
// so the test can assert on src + responsive visibility classes.
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className, style }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} style={style} />
  ),
}));

vi.mock('@components/ui/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import TimeBannerCarousel from '@components/themes/time/home/time-banner-carousel';

const DESKTOP = 'https://cdn.example.com/hero-desktop.jpg';
const MOBILE = 'https://cdn.example.com/hero-mobile.jpg';

const slide = {
  id: 'slide-1',
  image: DESKTOP,
  mobileImage: MOBILE,
  alt: 'Promo',
};

describe('TimeBannerCarousel — Hero Slider mobile image (carousel-hero)', () => {
  it('renders the mobile image URL when one is configured', () => {
    render(<TimeBannerCarousel data={[slide]} lang="it" />);

    const srcs = screen.getAllByRole('img').map((el) => el.getAttribute('src'));
    expect(srcs).toContain(MOBILE);
  });

  it('renders the desktop image URL as well', () => {
    render(<TimeBannerCarousel data={[slide]} lang="it" />);

    const srcs = screen.getAllByRole('img').map((el) => el.getAttribute('src'));
    expect(srcs).toContain(DESKTOP);
  });

  it('hides the mobile image at md+ and hides the desktop image below md', () => {
    render(<TimeBannerCarousel data={[slide]} lang="it" />);

    const imgs = screen.getAllByRole('img');
    const mobileImg = imgs.find((el) => el.getAttribute('src') === MOBILE)!;
    const desktopImg = imgs.find((el) => el.getAttribute('src') === DESKTOP)!;

    // Mobile artwork shows only on small screens
    expect(mobileImg.className).toContain('md:hidden');
    // Desktop artwork is suppressed on small screens
    expect(desktopImg.className).toContain('hidden');
    expect(desktopImg.className).toContain('md:block');
  });

  it('falls back to the desktop artwork when no mobile image is configured', () => {
    render(
      <TimeBannerCarousel
        data={[{ id: 's2', image: DESKTOP, alt: 'Promo' }]}
        lang="it"
      />,
    );

    const srcs = screen.getAllByRole('img').map((el) => el.getAttribute('src'));
    expect(srcs).toContain(DESKTOP);
    expect(srcs).not.toContain(MOBILE);
  });
});
