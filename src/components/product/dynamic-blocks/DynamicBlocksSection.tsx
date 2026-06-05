'use client';

import React from 'react';
import type { DynamicBlock } from '@framework/types';
import DynamicBlockView from './DynamicBlockView';

/** Shared filter+sort so the inline renderer and the section-3 tab agree. */
export function selectSectionBlocks(
  blocks: DynamicBlock[] | undefined,
  lang: string,
  section: 1 | 2 | 3 | 4,
): DynamicBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter(
      (b) =>
        b &&
        b.lang === lang &&
        b.is_active === true &&
        b.section === section,
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

const DynamicBlocksSection: React.FC<{
  blocks?: DynamicBlock[];
  lang: string;
  section: 1 | 2 | 3 | 4;
  className?: string;
}> = ({ blocks, lang, section, className }) => {
  // Section 3 is rendered as a tab via ProductB2BDetailsTab (see Task 21), not inline.
  if (section === 3) return null;

  const matching = selectSectionBlocks(blocks, lang, section);
  if (matching.length === 0) return null;

  return (
    <div className={className ?? 'space-y-6'}>
      {matching.map((block) => (
        <DynamicBlockView key={block.id} block={block} />
      ))}
    </div>
  );
};

export default DynamicBlocksSection;
