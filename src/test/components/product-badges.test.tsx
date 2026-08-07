import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

import ProductBadges from '@components/product/product-badges';

const badges = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.vinc-pbadge')).map(
    (el) => el.className,
  );

describe('ProductBadges', () => {
  it('renders nothing when no flag is set', () => {
    const { container } = render(<ProductBadges lang="it" product={{}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when every flag is false', () => {
    const { container } = render(
      <ProductBadges
        lang="it"
        product={{ has_video: false, has_3d: false, has_correlations: false }}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders only the video badge when only video is set', () => {
    const { container } = render(
      <ProductBadges lang="it" product={{ has_video: true }} />,
    );
    expect(badges(container)).toEqual(['vinc-pbadge vinc-pbadge--video']);
  });

  it('renders the three badges in a fixed order: video, 3D, related', () => {
    const { container } = render(
      <ProductBadges
        lang="it"
        product={{ has_video: true, has_3d: true, has_correlations: true }}
      />,
    );
    expect(badges(container)).toEqual([
      'vinc-pbadge vinc-pbadge--video',
      'vinc-pbadge vinc-pbadge--3d',
      'vinc-pbadge vinc-pbadge--related',
    ]);
  });

  it('carries no glyph in the markup — icons come from CSS', () => {
    const { container } = render(
      <ProductBadges lang="it" product={{ has_video: true, has_3d: true }} />,
    );
    for (const el of Array.from(container.querySelectorAll('.vinc-pbadge'))) {
      expect(el.textContent).toBe('');
    }
  });

  it('labels each badge for assistive tech', () => {
    const { container } = render(
      <ProductBadges lang="it" product={{ has_correlations: true }} />,
    );
    const el = container.querySelector('.vinc-pbadge--related')!;
    expect(el.getAttribute('aria-label')).toBe('Prodotti correlati');
    expect(el.getAttribute('title')).toBe('Prodotti correlati');
  });

  it('merges a caller className onto the wrapper', () => {
    const { container } = render(
      <ProductBadges
        lang="it"
        product={{ has_video: true }}
        className="vinc-pbadges--overlay"
      />,
    );
    expect(container.querySelector('.vinc-pbadges')!.className).toContain(
      'vinc-pbadges--overlay',
    );
  });
});
