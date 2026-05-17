import { Fragment } from 'react';
import { RichTextBlock } from './RichTextBlock';
import { CustomHTMLBlock } from './CustomHTMLBlock';
import { MediaImageBlock } from './MediaImageBlock';
import { YouTubeEmbedBlock } from './YouTubeEmbedBlock';
import { SpacerBlock } from './SpacerBlock';
import { ProductDataTableBlock } from './ProductDataTableBlock';
import { isFormContact, renderFormContact } from './form-contact';

interface CmsBlock {
  id: string;
  type: string;
  order?: number;
  config: any;
  metadata?: Record<string, unknown>;
}

interface Props {
  blocks: CmsBlock[];
  pageSlug: string;
  lang: string;
}

function renderOne(block: CmsBlock, pageSlug: string, lang: string) {
  const t = block.type;
  const variant = block.config?.variant;

  if (t === 'content-rich-text' || t === 'richText') {
    return <RichTextBlock config={block.config} />;
  }
  if (t === 'content-custom-html' || t === 'customHTML') {
    return <CustomHTMLBlock config={block.config} />;
  }
  if (t === 'media-image') {
    return <MediaImageBlock config={block.config} />;
  }
  if (t === 'media-youtube' || t === 'youtubeEmbed') {
    return <YouTubeEmbedBlock config={block.config} />;
  }
  if (t === 'spacer') {
    return <SpacerBlock config={block.config} />;
  }
  if (
    t === 'productDetail-dataTable' ||
    t === 'product-data-table' ||
    t === 'productDataTable' ||
    t === 'attribute-table' ||
    variant === 'productDataTable' ||
    variant === 'product-data-table'
  ) {
    return <ProductDataTableBlock config={block.config} lang={lang} />;
  }
  if (isFormContact(block)) {
    return renderFormContact(block, pageSlug);
  }

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
        Unknown CMS block type: {t}
      </div>
    );
  }
  return null;
}

export function CmsPageRenderer({ blocks, pageSlug, lang }: Props) {
  return (
    <>
      {blocks.map((b) => (
        <Fragment key={b.id}>{renderOne(b, pageSlug, lang)}</Fragment>
      ))}
    </>
  );
}
