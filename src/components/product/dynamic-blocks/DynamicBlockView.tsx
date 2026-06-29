'use client';

import React from 'react';
import type { DynamicBlock } from '@framework/types';
import BlockElementView from './BlockElementView';

const DynamicBlockView: React.FC<{ block: DynamicBlock }> = ({ block }) => {
  const elements = Array.isArray(block.elements) ? block.elements : [];
  if (elements.length === 0) return null;

  const columns = Math.min(Math.max(block.columns ?? 1, 1), 8);
  // On mobile, halve the column count (rounded up) so tiles stay a compact
  // grid instead of one full-width tile per row; single-column blocks stay
  // full width.
  const mobileColumns = Math.ceil(columns / 2);

  return (
    <section className="dynamic-block">
      {block.title ? (
        <h3 className="mb-3 text-base font-semibold tracking-wide text-brand-dark">
          {block.title}
        </h3>
      ) : null}
      <div
        className="grid gap-4 [grid-template-columns:var(--db-cols-mobile)] sm:[grid-template-columns:var(--db-cols)]"
        style={
          {
            '--db-cols-mobile': `repeat(${mobileColumns}, minmax(0, 1fr))`,
            '--db-cols': `repeat(${columns}, minmax(0, 1fr))`,
          } as React.CSSProperties
        }
      >
        {elements.map((el) => (
          <BlockElementView key={el.id} element={el} />
        ))}
      </div>
    </section>
  );
};

export default DynamicBlockView;
