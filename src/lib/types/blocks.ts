// Product Detail specific block types

export interface ProductInfoBlockConfig {
  variant: "productInfo";
  showImages?: boolean;
  showPrice?: boolean;
  showDescription?: boolean;
  showSpecifications?: boolean;
  showAvailability?: boolean;
  layout?: "default" | "wide" | "compact";
}

export interface ProductSuggestionsBlockConfig {
  variant: "productSuggestions";
  title?: string;
  source: "search" | "related" | "manual";
  searchQuery?: string;
  searchFilters?: Record<string, string>;
  productIds?: string[];
  limit: number;
  layout: "grid" | "slider";
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface RichTextBlockConfig {
  variant: "richText";
  content: string;
  width?: "full" | "contained";
  textAlign?: "left" | "center" | "right";
  padding?: "none" | "small" | "medium" | "large";
}

export interface CustomHTMLBlockConfig {
  variant: "customHTML";
  html: string;
  containerClass?: string;
}

export interface SpacerBlockConfig {
  variant: "spacer";
  height: number;
  unit: "px" | "rem";
}

export interface YouTubeEmbedBlockConfig {
  url: string;
  title?: string;
  autoplay?: boolean;
  width?: string;
  height?: string;
}

export type ProductDetailBlockConfig =
  | ProductInfoBlockConfig
  | ProductSuggestionsBlockConfig
  | RichTextBlockConfig
  | CustomHTMLBlockConfig
  | SpacerBlockConfig
  | YouTubeEmbedBlockConfig;

// Zone types for product detail page placement
export type ProductDetailZone = "zone1" | "zone2" | "zone3" | "zone4";

export interface PageBlock<TConfig = ProductDetailBlockConfig> {
  id: string;
  type: string;
  order: number;
  config: TConfig;
  metadata?: Record<string, unknown>;
  // Zone placement for product detail pages
  zone?: ProductDetailZone;
  // Tab label for zone3 (new tab placement)
  tabLabel?: string;
  tabIcon?: string;
}

export interface PageSEOSettings {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  image?: string;
}

export interface PageVersionAttributes {
  region?: string;
  language?: string;
  device?: string;
  [key: string]: string | undefined;
}

export interface PageVersionTags {
  campaign?: string;
  segment?: string;
  attributes?: PageVersionAttributes;
}

export interface PageVersion {
  version: number;
  blocks: PageBlock[];
  seo?: PageSEOSettings;
  status: "draft" | "published";
  createdAt: string;
  lastSavedAt: string;
  publishedAt?: string;
  createdBy?: string;
  comment?: string;
  tag?: string; // legacy single-tag support
  tags?: PageVersionTags;
  priority?: number;
  isDefault?: boolean;
  activeFrom?: string | Date;
  activeTo?: string | Date;
}

export interface PageConfig {
  slug: string;
  name: string;
  versions: PageVersion[];
  currentVersion: number;
  currentPublishedVersion?: number;
  updatedAt: string;
  createdAt: string;
}
