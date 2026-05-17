import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/blocks/CustomHTMLBlock', () => ({
  CustomHTMLBlock: ({ config }: any) => (
    <div data-testid="custom-html">{config?.html}</div>
  ),
}));
vi.mock('@/components/blocks/RichTextBlock', () => ({
  RichTextBlock: ({ config }: any) => (
    <div data-testid="rich-text">{config?.html}</div>
  ),
}));
vi.mock('@/components/blocks/MediaImageBlock', () => ({
  MediaImageBlock: ({ config }: any) => (
    <img data-testid="media-image" alt="" src={config?.src} />
  ),
}));
vi.mock('@/components/blocks/YouTubeEmbedBlock', () => ({
  YouTubeEmbedBlock: ({ config }: any) => (
    <div data-testid="yt">{config?.videoId}</div>
  ),
}));
vi.mock('@/components/blocks/SpacerBlock', () => ({
  SpacerBlock: () => <div data-testid="spacer" />,
}));
vi.mock('@/components/blocks/FormBlock', () => ({
  FormBlock: ({ config, blockId, pageSlug }: any) => (
    <div data-testid="form" data-block-id={blockId} data-page={pageSlug}>
      {config?.title}
    </div>
  ),
}));
vi.mock('@/components/blocks/ProductDataTableBlock', () => ({
  ProductDataTableBlock: ({ config }: any) => (
    <div data-testid="product-data-table">{config?.title}</div>
  ),
}));

import { CmsPageRenderer } from '@/components/blocks/CmsPageRenderer';

const block = (over: any) => ({
  id: 'b1',
  order: 0,
  config: {},
  metadata: {},
  ...over,
});

describe('CmsPageRenderer', () => {
  it('renders content-custom-html via CustomHTMLBlock', () => {
    render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[block({ type: 'content-custom-html', config: { html: 'X' } })]}
      />,
    );
    expect(screen.getByTestId('custom-html')).toHaveTextContent('X');
  });

  it('accepts short alias customHTML', () => {
    render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[block({ type: 'customHTML', config: { html: 'Y' } })]}
      />,
    );
    expect(screen.getByTestId('custom-html')).toHaveTextContent('Y');
  });

  it('renders form-contact via FormBlock with blockId + pageSlug', () => {
    render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[
          block({
            id: 'form-1',
            type: 'form-contact',
            config: { variant: 'form', title: 'Hello', fields: [] },
          }),
        ]}
      />,
    );
    const node = screen.getByTestId('form');
    expect(node).toHaveTextContent('Hello');
    expect(node).toHaveAttribute('data-block-id', 'form-1');
    expect(node).toHaveAttribute('data-page', 'faq');
  });

  it('silently skips unknown block in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { container } = render(
        <CmsPageRenderer
          pageSlug="faq"
          lang="it"
          blocks={[block({ type: 'mystery', config: {} })]}
        />,
      );
      expect(container.textContent).toBe('');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('renders blocks in array order', () => {
    render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[
          block({
            id: 'a',
            type: 'content-custom-html',
            config: { html: 'A' },
          }),
          block({
            id: 'b',
            type: 'content-custom-html',
            config: { html: 'B' },
          }),
        ]}
      />,
    );
    const nodes = screen.getAllByTestId('custom-html');
    expect(nodes[0]).toHaveTextContent('A');
    expect(nodes[1]).toHaveTextContent('B');
  });
});
