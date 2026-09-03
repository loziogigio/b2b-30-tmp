import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

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

import TimeHeroCarousel from '@components/themes/time/home/time-hero-carousel';

const DESKTOP = 'https://cdn.example.com/hero-desktop.jpg';
const MOBILE = 'https://cdn.example.com/hero-mobile.jpg';

const slide = {
  id: 'slide-1',
  image: DESKTOP,
  mobileImage: MOBILE,
  alt: 'Promo',
};

describe('TimeHeroCarousel — mobile image (hero-with-widgets)', () => {
  it('renders both the desktop and the mobile artwork', () => {
    render(<TimeHeroCarousel slides={[slide]} lang="it" />);

    const srcs = screen.getAllByRole('img').map((el) => el.getAttribute('src'));
    expect(srcs).toContain(DESKTOP);
    expect(srcs).toContain(MOBILE);
  });

  it('swaps the two layers at the md breakpoint', () => {
    render(<TimeHeroCarousel slides={[slide]} lang="it" />);

    const imgs = screen.getAllByRole('img');
    const mobileImg = imgs.find((el) => el.getAttribute('src') === MOBILE)!;
    const desktopImg = imgs.find((el) => el.getAttribute('src') === DESKTOP)!;

    expect(mobileImg.className).toContain('md:hidden');
    expect(desktopImg.className).toContain('hidden');
    expect(desktopImg.className).toContain('md:block');
  });

  it('gives the hero box a dedicated aspect ratio below md', () => {
    const { container } = render(
      <TimeHeroCarousel slides={[slide]} lang="it" />,
    );

    const box = container.querySelector(
      '[class*="aspect-[var(--time-ar-mobile)]"]',
    ) as HTMLElement;

    expect(box).not.toBeNull();
    expect(box.className).toContain('md:aspect-[var(--time-ar-desktop)]');
    expect(box.style.getPropertyValue('--time-ar-mobile')).toBe('768 / 800');
    expect(box.style.getPropertyValue('--time-ar-desktop')).toBe('16 / 6');
    // Inline aspect-ratio would override the md: class
    expect(box.style.aspectRatio).toBe('');
  });

  it('keeps the 16/6 box and a single image when no mobile artwork is set', () => {
    const { container } = render(
      <TimeHeroCarousel
        slides={[{ id: 's2', image: DESKTOP, alt: 'Promo' }]}
        lang="it"
      />,
    );

    const srcs = screen.getAllByRole('img').map((el) => el.getAttribute('src'));
    expect(srcs).toEqual([DESKTOP]);

    const box = screen.getAllByRole('img')[0].parentElement as HTMLElement;
    expect(box.style.aspectRatio).toBe('16 / 6');
    expect(container.innerHTML).not.toContain('--time-ar-mobile');
  });
});
