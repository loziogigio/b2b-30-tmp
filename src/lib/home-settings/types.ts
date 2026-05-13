export interface CompanyBranding {
  // Required
  title: string;

  // Basic branding (optional)
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  /** Shop/Storefront URL for email redirects */
  shopUrl?: string;
  /** Company website URL */
  websiteUrl?: string;

  // Extended theme colors (optional)
  /** Accent color for buttons, links, CTAs */
  accentColor?: string;
  /** Main body text color (default: #000000) */
  textColor?: string;
  /** Secondary/muted text color (default: #595959) */
  mutedColor?: string;
  /** Page background color (default: #ffffff) */
  backgroundColor?: string;
  /** Header background color (empty = transparent/inherit) */
  headerBackgroundColor?: string;
  /** Footer background color (default: #f5f5f5) */
  footerBackgroundColor?: string;
  /** Footer text color (default: #666666) */
  footerTextColor?: string;
}

export interface ProductCardStyle {
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  shadowSize: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shadowColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  hoverEffect: 'none' | 'lift' | 'shadow' | 'scale' | 'border' | 'glow';
  hoverScale?: number;
  hoverShadowSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  backgroundColor: string;
  hoverBackgroundColor?: string;
  priceDecimals?: number;
}

// ============================================================================
// Header Builder Types
// ============================================================================

export type RowLayout =
  | 'full' // 1 block: 100%
  | '50-50' // 2 blocks: 50% / 50%
  | '33-33-33' // 3 blocks: 33% / 33% / 33%
  | '20-60-20' // 3 blocks: 20% / 60% / 20% (main header style)
  | '25-50-25' // 3 blocks: 25% / 50% / 25%
  | '30-40-30'; // 3 blocks: 30% / 40% / 30%

export type HeaderWidgetType =
  | 'logo' // Company logo
  | 'search-bar' // Product search
  | 'radio-widget' // Radio player with links
  | 'category-menu' // Categories dropdown
  | 'cart' // Shopping cart
  | 'company-info' // Delivery address, balance
  | 'no-price' // Toggle price visibility
  | 'favorites' // Wishlist
  | 'compare' // Product comparison
  | 'profile' // User profile/login
  | 'button' // Custom button/link (multiple allowed)
  | 'spacer' // Flexible space (multiple allowed)
  | 'divider' // Vertical divider (multiple allowed)
  | 'app-launcher'; // Cross-app navigation (B2B ↔ Vetrina)

export interface RadioStation {
  id: string;
  name: string;
  logoUrl?: string;
  streamUrl: string;
}

export interface WidgetConfig {
  // Button widget
  label?: string;
  url?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  backgroundColor?: string;
  textColor?: string;
  openInNewTab?: boolean;

  // Search bar widget
  placeholder?: string;
  width?: 'sm' | 'md' | 'lg' | 'full';

  // Category menu widget
  menuId?: string;
  channel?: string;

  // Icon widgets (cart, favorites, compare, profile)
  showLabel?: boolean;
  showBadge?: boolean;

  // Radio widget
  enabled?: boolean;
  headerIcon?: string;
  stations?: RadioStation[];
}

export interface HeaderWidget {
  id: string;
  type: HeaderWidgetType;
  config: WidgetConfig;
}

export interface HeaderBlock {
  id: string;
  alignment: 'left' | 'center' | 'right';
  widgets: HeaderWidget[];
}

export interface HeaderRow {
  id: string;
  enabled: boolean;
  fixed: boolean; // Sticky/freeze row
  backgroundColor?: string;
  textColor?: string;
  height?: number; // Row height in px
  layout: RowLayout;
  blocks: HeaderBlock[];
}

export interface HeaderConfig {
  rows: HeaderRow[];
}

// ============================================================================
// SEO Meta Tags Types
// ============================================================================

export interface MetaTags {
  // Basic SEO
  title?: string; // Page title (50-60 chars recommended)
  description?: string; // Meta description (150-160 chars recommended)
  keywords?: string; // Comma-separated keywords
  author?: string; // Content author
  robots?: string; // e.g., "index, follow" or "noindex, nofollow"
  canonicalUrl?: string; // Preferred URL for homepage

  // Open Graph (Facebook, LinkedIn)
  ogTitle?: string; // Defaults to title if not set
  ogDescription?: string; // Defaults to description if not set
  ogImage?: string; // Image URL (1200x630 recommended)
  ogSiteName?: string; // Website name
  ogType?: string; // "website", "article", "product", etc.

  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string; // @username of the site
  twitterCreator?: string; // @username of content creator
  twitterImage?: string; // Image URL (defaults to ogImage)

  // Additional
  structuredData?: string; // JSON-LD as stringified JSON
  themeColor?: string; // Mobile browser theme color
  googleSiteVerification?: string;
  bingSiteVerification?: string;
}

// ============================================================================
// Footer Types
//
// Mirror of the admin (vinc-commerce-suite) `IB2CStorefrontFooter` model,
// camelCased to match this file's convention. When `FooterConfig` is present on
// `HomeSettings`, it supersedes the legacy top-level `footerHtml` field.
// ============================================================================

export type FooterItemType = 'text' | 'link' | 'image';

export interface FooterColumnItem {
  type: FooterItemType;
  /** type: "text" — text / inline-HTML content */
  textContent?: string;
  /** type: "image" */
  imageUrl?: string;
  imageAlt?: string;
  /** Max image width in px (defaults to 200 at render time) */
  imageMaxWidth?: number;
  /** type: "link" */
  label?: string;
  href?: string;
  openInNewTab?: boolean;
}

export interface FooterLink {
  label: string;
  href: string;
  openInNewTab?: boolean;
}

export interface FooterColumn {
  title: string;
  /** Mixed content items — when present, take priority over `links` */
  items?: FooterColumnItem[];
  /** Legacy links array — fallback when `items` is absent */
  links: FooterLink[];
}

export interface FooterSocialLink {
  /** e.g. "facebook" | "instagram" | "x" | "twitter" | "linkedin" | "youtube" | ... */
  platform: string;
  url: string;
}

export interface FooterConfig {
  columns?: FooterColumn[];
  socialLinks?: FooterSocialLink[];
  copyrightText?: string;
  showNewsletter?: boolean;
  newsletterHeading?: string;
  newsletterPlaceholder?: string;
  /** Footer background color (overrides branding.footerBackgroundColor) */
  bgColor?: string;
  /** Footer text color (overrides branding.footerTextColor) */
  textColor?: string;
  /** Full HTML footer (published) — when set, overrides structured columns */
  footerHtml?: string;
  /** Full HTML footer (draft) — never rendered on the public site */
  footerHtmlDraft?: string;
}

// ============================================================================
// Home Settings Main Interface
// ============================================================================

export interface HomeSettings {
  _id?: string;
  customerId?: string;
  companyName?: string;
  branding: CompanyBranding;
  defaultCardVariant: 'b2b' | 'horizontal' | 'compact' | 'detailed';
  cardStyle: ProductCardStyle;

  /** Structured footer configuration (from `portal.footer`). When present,
   *  supersedes the legacy top-level `footerHtml` / `footerHtmlDraft`. */
  footer?: FooterConfig;

  /** @deprecated Use `footer.footerHtml`. Kept for backward compatibility. */
  footerHtml?: string;
  /** @deprecated Use `footer.footerHtmlDraft`. */
  footerHtmlDraft?: string;

  /** Published header configuration */
  headerConfig?: HeaderConfig;
  /** Draft header configuration (for preview before publishing) */
  headerConfigDraft?: HeaderConfig;

  /** SEO meta tags configuration */
  meta_tags?: MetaTags;

  createdAt?: string | Date;
  updatedAt?: string | Date;
  lastModifiedBy?: string;
}
