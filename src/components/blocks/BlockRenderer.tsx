import type { PageBlock } from '@/lib/types/blocks';
import { ProductInfoBlock } from './ProductInfoBlock';
import { ProductSuggestionsBlock } from './ProductSuggestionsBlock';
import { RichTextBlock } from './RichTextBlock';
import { CustomHTMLBlock } from './CustomHTMLBlock';
import { SpacerBlock } from './SpacerBlock';
import { YouTubeEmbedBlock } from './YouTubeEmbedBlock';
import { MediaImageBlock } from './MediaImageBlock';
import { ProductDataTableBlock } from './ProductDataTableBlock';

interface BlockRendererProps {
  block: PageBlock;
  productData?: any;
}

export function BlockRenderer({ block, productData }: BlockRendererProps) {
  const blockType = block.type;
  const configVariant = (block.config as any)?.variant;
  const langFromProduct =
    typeof productData?.lang === 'string' ? productData.lang : undefined;

  // Product detail specific blocks
  if (blockType === 'productInfo') {
    return (
      <ProductInfoBlock
        config={block.config as any}
        productData={productData}
      />
    );
  }

  if (blockType === 'productSuggestions') {
    return (
      <ProductSuggestionsBlock
        config={block.config as any}
        productData={productData}
      />
    );
  }

  if (blockType === 'richText' || blockType === 'content-rich-text') {
    return <RichTextBlock config={block.config as any} />;
  }

  if (blockType === 'customHTML' || blockType === 'content-custom-html') {
    return <CustomHTMLBlock config={block.config as any} />;
  }

  if (blockType === 'spacer') {
    return <SpacerBlock config={block.config as any} />;
  }

  // Media blocks
  if (blockType === 'youtubeEmbed') {
    return <YouTubeEmbedBlock config={block.config as any} />;
  }

  if (blockType === 'media-image') {
    return <MediaImageBlock config={block.config as any} />;
  }

  if (
    blockType === 'product-data-table' ||
    blockType === 'productDataTable' ||
    blockType === 'attribute-table' ||
    configVariant === 'productDataTable' ||
    configVariant === 'product-data-table'
  ) {
    return (
      <ProductDataTableBlock
        config={block.config as any}
        lang={langFromProduct}
      />
    );
  }

  if (configVariant === 'richText') {
    return <RichTextBlock config={block.config as any} />;
  }

  // Legacy/unknown block types - only show in development
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
        Unknown block type: {blockType}
      </div>
    );
  }

  // In production, silently skip unknown blocks
  return null;
}
