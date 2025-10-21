import type { PageBlock } from "@/lib/types/blocks";
import { ProductInfoBlock } from "./ProductInfoBlock";
import { ProductSuggestionsBlock } from "./ProductSuggestionsBlock";
import { RichTextBlock } from "./RichTextBlock";
import { CustomHTMLBlock } from "./CustomHTMLBlock";
import { SpacerBlock } from "./SpacerBlock";
import { YouTubeEmbedBlock } from "./YouTubeEmbedBlock";
import { MediaImageBlock } from "./MediaImageBlock";

interface BlockRendererProps {
  block: PageBlock;
  productData?: any;
}

export function BlockRenderer({ block, productData }: BlockRendererProps) {
  const blockType = block.type;

  // Product detail specific blocks
  if (blockType === "productInfo") {
    return <ProductInfoBlock config={block.config as any} productData={productData} />;
  }

  if (blockType === "productSuggestions") {
    return <ProductSuggestionsBlock config={block.config as any} productData={productData} />;
  }

  if (blockType === "richText" || blockType === "content-rich-text") {
    return <RichTextBlock config={block.config as any} />;
  }

  if (blockType === "customHTML") {
    return <CustomHTMLBlock config={block.config as any} />;
  }

  if (blockType === "spacer") {
    return <SpacerBlock config={block.config as any} />;
  }

  // Media blocks
  if (blockType === "youtubeEmbed") {
    return <YouTubeEmbedBlock config={block.config as any} />;
  }

  if (blockType === "media-image") {
    return <MediaImageBlock config={block.config as any} />;
  }

  const config = block.config as Record<string, unknown> | undefined;
  if (config && config["variant"] === "richText") {
    return <RichTextBlock config={config as any} />;
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
