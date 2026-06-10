import { Fragment } from 'react';
import { RichTextBlock } from './RichTextBlock';
import { CustomHTMLBlock } from './CustomHTMLBlock';
import { MediaImageBlock } from './MediaImageBlock';
import { YouTubeEmbedBlock } from './YouTubeEmbedBlock';
import { SpacerBlock } from './SpacerBlock';
import { ProductDataTableBlock } from './ProductDataTableBlock';
import { isFormContact, renderFormContact } from './form-contact';
import ThemedHomeBlock from './ThemedHomeBlock';
import Container from '@components/ui/container';
import { isBlockFullWidth } from '@/lib/blocks/block-layout';

interface CmsBlock {
  id: string;
  type: string;
  order?: number;
  config: any;
  layout?: string;
  metadata?: Record<string, unknown>;
}

interface Props {
  blocks: CmsBlock[];
  pageSlug: string;
  lang: string;
}

/**
 * Render a single block's inner content (no layout wrapper).
 *
 * Returns `{ element, selfWrapped }`. The theme-delegated path wraps itself in
 * a Container (the theme renderers honor the block layout), so the caller must
 * NOT wrap it again — `selfWrapped` is true for that path and false for the
 * blocks handled directly here.
 */
function renderOne(block: CmsBlock, pageSlug: string, lang: string) {
  const t = block.type;
  const variant = block.config?.variant;

  if (t === 'content-rich-text' || t === 'richText') {
    return { element: <RichTextBlock config={block.config} /> };
  }
  if (t === 'content-custom-html' || t === 'customHTML') {
    return { element: <CustomHTMLBlock config={block.config} /> };
  }
  if (t === 'media-image') {
    return { element: <MediaImageBlock config={block.config} /> };
  }
  if (t === 'media-youtube' || t === 'youtubeEmbed') {
    return { element: <YouTubeEmbedBlock config={block.config} /> };
  }
  if (t === 'spacer') {
    return { element: <SpacerBlock config={block.config} /> };
  }
  if (
    t === 'productDetail-dataTable' ||
    t === 'product-data-table' ||
    t === 'productDataTable' ||
    t === 'attribute-table' ||
    variant === 'productDataTable' ||
    variant === 'product-data-table'
  ) {
    return {
      element: <ProductDataTableBlock config={block.config} lang={lang} />,
    };
  }
  if (isFormContact(block)) {
    return { element: renderFormContact(block, pageSlug) };
  }

  // Anything not explicitly handled above (hero-with-widgets, all carousel-*
  // blocks incl. carousel-gallery/products/hero/promo/brand/flyer, etc.) is
  // delegated to the active theme's block renderer — the same one the home
  // page uses — so CMS pages render the full block catalog instead of dropping
  // unsupported blocks. It returns null for genuinely unknown types. The theme
  // renderer applies its own Container, so it is flagged self-wrapped.
  return {
    element: <ThemedHomeBlock block={block} lang={lang} />,
    selfWrapped: true,
  };
}

export function CmsPageRenderer({ blocks, pageSlug, lang }: Props) {
  return (
    <>
      {blocks.map((b) => {
        const { element, selfWrapped } = renderOne(b, pageSlug, lang);
        return (
          <Fragment key={b.id}>
            {selfWrapped ? (
              element
            ) : (
              <Container fullWidth={isBlockFullWidth(b)}>{element}</Container>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
