import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DynamicBlock } from '@framework/types';

// next/image -> plain img so onError/src assertions are simple
vi.mock('@components/ui/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt ?? ''} />;
  },
}));
vi.mock('@assets/placeholders', () => ({
  productPlaceholder: '/placeholder.png',
}));
// model-viewer dynamic import must not touch the network under jsdom
vi.mock('@google/model-viewer', () => ({}));

import DynamicBlockView from '@components/product/dynamic-blocks/DynamicBlockView';
import { selectSectionBlocks } from '@components/product/dynamic-blocks/DynamicBlocksSection';

const baseBlock = (over: Partial<DynamicBlock> = {}): DynamicBlock => ({
  id: 'blk_01',
  lang: 'it',
  title: 'Brevetti',
  section: 1,
  order: 0,
  columns: 2,
  is_active: true,
  elements: [],
  ...over,
});

describe('DynamicBlockView', () => {
  it('renders nothing for a block with no elements', () => {
    const { container } = render(<DynamicBlockView block={baseBlock()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title and a CSS grid sized to columns', () => {
    const block = baseBlock({
      columns: 2,
      elements: [
        { id: 'e1', kind: 'image', media: { url: 'https://cdn/x/p1.png' } },
        { id: 'e2', kind: 'image', media: { url: 'https://cdn/x/p2.png' } },
      ],
    });
    const { container } = render(<DynamicBlockView block={block} />);
    expect(screen.getByText('Brevetti')).toBeInTheDocument();
    const grid = container.querySelector('.grid') as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid.style.getPropertyValue('--db-cols')).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('switches on kind: text renders its string, media with no url is skipped', () => {
    const block = baseBlock({
      columns: 1,
      elements: [
        { id: 't1', kind: 'text', text: 'Ciao mondo' },
        // missing media.url -> skipped
        { id: 'm1', kind: 'image', media: { url: '' } },
      ],
    });
    render(<DynamicBlockView block={block} />);
    expect(screen.getByText('Ciao mondo')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('wraps an image element in a new-tab link when link is present', () => {
    const block = baseBlock({
      columns: 1,
      elements: [
        {
          id: 'e1',
          kind: 'image',
          media: { url: 'https://cdn/x/p1.png', alt: 'Patent 1' },
          link: { href: 'https://patents.example/1', new_tab: true },
          description: 'Descrizione 1',
        },
      ],
    });
    render(<DynamicBlockView block={block} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://patents.example/1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Descrizione 1')).toBeInTheDocument();
  });
});

describe('selectSectionBlocks', () => {
  const blocks: DynamicBlock[] = [
    baseBlock({ id: 'b1', lang: 'it', section: 1, order: 2, is_active: true }),
    baseBlock({ id: 'b2', lang: 'it', section: 1, order: 1, is_active: true }),
    baseBlock({ id: 'b3', lang: 'de', section: 1, order: 0, is_active: true }),
    baseBlock({ id: 'b4', lang: 'it', section: 2, order: 0, is_active: true }),
    baseBlock({ id: 'b5', lang: 'it', section: 1, order: 3, is_active: false }),
    baseBlock({ id: 'b6', lang: 'it', section: 3, order: 0, is_active: true }),
  ];

  it('filters by lang, section, and is_active, then sorts by order', () => {
    const result = selectSectionBlocks(blocks, 'it', 1);
    expect(result.map((b) => b.id)).toEqual(['b2', 'b1']);
  });

  it('returns blocks for section 3 (does not special-case it)', () => {
    const result = selectSectionBlocks(blocks, 'it', 3);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b6');
  });

  it('excludes inactive blocks', () => {
    const result = selectSectionBlocks(blocks, 'it', 1);
    expect(result.find((b) => b.id === 'b5')).toBeUndefined();
  });

  it('excludes wrong-language blocks', () => {
    const result = selectSectionBlocks(blocks, 'it', 1);
    expect(result.find((b) => b.id === 'b3')).toBeUndefined();
  });

  it('returns empty array for undefined input', () => {
    expect(selectSectionBlocks(undefined, 'it', 1)).toEqual([]);
  });
});
