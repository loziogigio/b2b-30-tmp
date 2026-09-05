import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Requests that skip the locale middleware (`/favicon.ico`, Apple touch-icon
 * variants, other dotted root paths) land in the `[lang]` tree with that raw
 * first segment as the language. Next 16 forbids `notFound()` in the root
 * layout, so the route-group layout below it is the universal guard: an
 * unsupported language must be a real 404, not a rendered home page.
 */

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/theme/server', () => ({
  getThemeIdFromRequest: async () => 'default',
}));
vi.mock('@/components/themes/default/layout/default-layout', () => ({
  default: ({ children }: any) => (
    <div data-testid="default-layout">{children}</div>
  ),
}));
vi.mock('@/components/themes/time/layout/time-layout', () => ({
  default: ({ children }: any) => (
    <div data-testid="time-layout">{children}</div>
  ),
}));

import Layout from '@/app/[lang]/(default)/layout';

const renderLayout = (lang: string) =>
  Layout({
    children: <span>page-content</span>,
    params: Promise.resolve({ lang }),
  });

describe('(default) layout language guard', () => {
  it('renders the themed layout for a supported language', async () => {
    render(await renderLayout('it'));
    expect(screen.getByTestId('default-layout')).toBeInTheDocument();
    expect(screen.getByText('page-content')).toBeInTheDocument();
  });

  it.each(['favicon.ico', 'apple-touch-icon-120x120.png', 'wp-json'])(
    'answers 404 when the route language is %s',
    async (lang) => {
      await expect(renderLayout(lang)).rejects.toThrow('NEXT_NOT_FOUND');
    },
  );
});
