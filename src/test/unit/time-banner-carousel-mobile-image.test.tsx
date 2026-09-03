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

describe('TimeBannerCarousel — dedicated mobile aspect ratio below md', () => {
  it('drives the slide box with responsive aspect-ratio vars when a mobile image exists', () => {
    render(
      <TimeBannerCarousel
        data={[slide]}
        lang="it"
        aspectRatio="3 / 1"
        mobileAspectRatio="768 / 800"
      />,
    );

    const mobileImg = screen
      .getAllByRole('img')
      .find((el) => el.getAttribute('src') === MOBILE)!;
    const box = mobileImg.parentElement as HTMLElement;

    expect(box.className).toContain('aspect-[var(--time-ar-mobile)]');
    expect(box.className).toContain('md:aspect-[var(--time-ar-desktop)]');
    expect(box.style.getPropertyValue('--time-ar-mobile')).toBe('768 / 800');
    expect(box.style.getPropertyValue('--time-ar-desktop')).toBe('3 / 1');
  });

  it('drops the inline aspect-ratio so the responsive classes are not overridden', () => {
    render(
      <TimeBannerCarousel
        data={[slide]}
        lang="it"
        aspectRatio="3 / 1"
        mobileAspectRatio="768 / 800"
      />,
    );

    const mobileImg = screen
      .getAllByRole('img')
      .find((el) => el.getAttribute('src') === MOBILE)!;
    const box = mobileImg.parentElement as HTMLElement;

    // An inline aspect-ratio would win over the md: class and pin mobile to 3/1
    expect(box.style.aspectRatio).toBe('');
  });

  it('keeps the plain inline aspect ratio when no mobile image is configured', () => {
    render(
      <TimeBannerCarousel
        data={[{ id: 's3', image: DESKTOP, alt: 'Promo' }]}
        lang="it"
        aspectRatio="3 / 1"
        mobileAspectRatio="768 / 800"
      />,
    );

    const box = screen.getAllByRole('img')[0].parentElement as HTMLElement;
    expect(box.style.aspectRatio).toBe('3 / 1');
    expect(box.className).not.toContain('aspect-[var(--time-ar-mobile)]');
  });

  it('respects an explicit fixed mediaHeight instead of swapping ratios', () => {
    render(
      <TimeBannerCarousel
        data={[slide]}
        lang="it"
        mediaHeight="420px"
        mobileAspectRatio="768 / 800"
      />,
    );

    const mobileImg = screen
      .getAllByRole('img')
      .find((el) => el.getAttribute('src') === MOBILE)!;
    const box = mobileImg.parentElement as HTMLElement;

    expect(box.style.height).toBe('420px');
    expect(box.className).not.toContain('aspect-[var(--time-ar-mobile)]');
  });
});
