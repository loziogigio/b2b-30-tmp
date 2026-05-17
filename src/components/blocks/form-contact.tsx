/**
 * Shared form-contact dispatch — used by every block renderer that needs to
 * surface a `form-contact` block (CmsPageRenderer, BlockRenderer,
 * HomeBlockRenderer, and the per-theme home renderers).
 *
 * Keep this module dependency-light: it only knows about the FormBlock
 * server wrapper. Layout/wrappers (Container, BlockWrapper) stay in the
 * caller so each surface decides its own spacing.
 */

import { FormBlock } from './FormBlock';

interface MinimalBlock {
  id: string;
  type: string;
  config: any;
}

export function isFormContact(block: { type: string }): boolean {
  return block.type === 'form-contact';
}

export function renderFormContact(block: MinimalBlock, pageSlug: string) {
  return (
    <FormBlock config={block.config} blockId={block.id} pageSlug={pageSlug} />
  );
}
