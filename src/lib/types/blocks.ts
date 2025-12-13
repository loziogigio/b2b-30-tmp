// Product Detail specific block types

export interface ProductInfoBlockConfig {
  variant: 'productInfo';
  showImages?: boolean;
  showPrice?: boolean;
  showDescription?: boolean;
  showSpecifications?: boolean;
  showAvailability?: boolean;
  layout?: 'default' | 'wide' | 'compact';
}

export interface ProductSuggestionsBlockConfig {
  variant: 'productSuggestions';
  title?: string;
  source: 'search' | 'related' | 'manual';
  searchQuery?: string;
  searchFilters?: Record<string, string>;
  productIds?: string[];
  limit: number;
  layout: 'grid' | 'slider';
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface RichTextBlockConfig {
  variant: 'richText';
  content: string;
  width?: 'full' | 'contained';
  textAlign?: 'left' | 'center' | 'right';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export interface CustomHTMLBlockConfig {
  variant: 'customHTML' | 'customHtml';
  html: string;
  containerClass?: string;
}

export interface SpacerBlockConfig {
  variant: 'spacer';
  height: number;
  unit: 'px' | 'rem';
}

export interface YouTubeEmbedBlockConfig {
  url: string;
  title?: string;
  autoplay?: boolean;
  width?: string;
  height?: string;
}

export type ProductDataTableValueType = 'text' | 'html' | 'image';

export interface ProductDataTableRowLinkConfig {
  url: string;
  openInNewTab?: boolean;
  rel?: string;
}

export interface ProductDataTableRowConfig {
  id?: string;
  label: string;
  leftValueType?: ProductDataTableValueType;
  valueType?: ProductDataTableValueType;
  value?: string;
  html?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageAspectRatio?: string;
  leftHtml?: string;
  leftLink?: ProductDataTableRowLinkConfig;
  leftHelperText?: string;
  valueImageUrl?: string;
  valueImageAlt?: string;
  valueImageAspectRatio?: string;
  link?: ProductDataTableRowLinkConfig;
  helperText?: string;
  highlight?: boolean;
}

export interface ProductDataTableBlockConfig {
  variant: 'productDataTable';
  title?: string;
  description?: string;
  /**
   * Grid column width (in pixels) for the first column on ≥ sm screens.
   * Defaults to 220 (matching legacy technical sheet layout).
   */
  labelColumnWidth?: number;
  /**
   * Optional surface customisation.
   */
  appearance?: {
    bordered?: boolean;
    rounded?: boolean;
    zebraStripes?: boolean;
  };
  rows: ProductDataTableRowConfig[];
}

export type ProductDetailBlockConfig =
  | ProductInfoBlockConfig
  | ProductSuggestionsBlockConfig
  | RichTextBlockConfig
  | CustomHTMLBlockConfig
  | SpacerBlockConfig
  | YouTubeEmbedBlockConfig
  | ProductDataTableBlockConfig;

// Zone types for product detail page placement
export type ProductDetailZone = 'zone1' | 'zone2' | 'zone3' | 'zone4';

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
  addressStates?: string[]; // Array of province codes (e.g., ["TO", "MI", "RM"])
  [key: string]: string | string[] | undefined;
}

export interface PageVersionTags {
  campaign?: string;
  segment?: string;
  addressState?: string; // User's current address state/province (e.g., "TO")
  attributes?: PageVersionAttributes;
}

export interface PageVersion {
  version: number;
  blocks: PageBlock[];
  seo?: PageSEOSettings;
  status: 'draft' | 'published';
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
