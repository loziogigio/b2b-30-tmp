/**
 * Maps the PIM B2B portal payload (`GET /api/b2b/b2b/public/home` → `portal`)
 * into this app's camelCased `HomeSettings` shape.
 *
 * The portal endpoint is the source of truth for branding, header config,
 * meta tags and the (structured) footer. Fields that still live in
 * `b2bhomesettings` and are not exposed by the portal endpoint
 * (`defaultCardVariant`, `cardStyle`) fall back to `DEFAULT_HOME_SETTINGS`.
 */
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';
import type {
  CompanyBranding,
  CustomScript,
  FooterColumn,
  FooterColumnItem,
  FooterConfig,
  HeaderConfig,
  HomeSettings,
  MetaTags,
  ProductCardStyle,
  ScriptLoadingStrategy,
  ScriptPlacement,
} from '@/lib/home-settings/types';

/** Minimal shape of the `portal` object returned by the PIM public B2B home endpoint. */
export interface PortalPayload {
  slug?: string;
  name?: string;
  branding?: PortalBranding;
  header_config?: HeaderConfig;
  header_config_draft?: HeaderConfig;
  footer?: PortalFooter;
  footer_draft?: PortalFooter;
  meta_tags?: PortalMetaTags;
  custom_scripts?: PortalCustomScript[];
  custom_css?: string;
  /**
   * Product card visual style + priceDecimals. Not currently shipped by the
   * portal endpoint (see commerce-suite's `buildPortalFromHomeSettings`, which
   * intentionally omits it). Declared here so the storefront automatically
   * picks it up the moment BE adds it; until then `cardStyle` stays at
   * `DEFAULT_HOME_SETTINGS.cardStyle`.
   */
  cardStyle?: Partial<ProductCardStyle>;
  /** present on the read-through fallback for unmigrated tenants */
  synthesized?: boolean;
}

interface PortalBranding {
  title?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
}

interface PortalFooterItem {
  type?: string;
  text_content?: string;
  image_url?: string;
  image_alt?: string;
  image_max_width?: number;
  label?: string;
  href?: string;
  open_in_new_tab?: boolean;
}

interface PortalFooterColumn {
  title?: string;
  items?: PortalFooterItem[];
  links?: { label?: string; href?: string; open_in_new_tab?: boolean }[];
}

interface PortalFooter {
  columns?: PortalFooterColumn[];
  social_links?: { platform?: string; url?: string }[];
  copyright_text?: string;
  show_newsletter?: boolean;
  newsletter_heading?: string;
  newsletter_placeholder?: string;
  bg_color?: string;
  text_color?: string;
  footer_html?: string;
  footer_html_draft?: string;
}

interface PortalMetaTags {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  robots?: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_site_name?: string;
  og_type?: string;
  twitter_card?: MetaTags['twitterCard'];
  twitter_site?: string;
  twitter_creator?: string;
  twitter_image?: string;
  structured_data?: string;
  theme_color?: string;
  google_site_verification?: string;
  bing_site_verification?: string;
}

interface PortalCustomScript {
  label?: string;
  src?: string;
  inline_code?: string;
  placement?: string;
  loading_strategy?: string;
  enabled?: boolean;
}

const SCRIPT_PLACEMENTS = new Set<ScriptPlacement>(['head', 'body_end']);
const SCRIPT_LOADING_STRATEGIES = new Set<ScriptLoadingStrategy>([
  'async',
  'defer',
  'blocking',
]);

/** Map the portal's snake_case custom scripts to camelCase, dropping empty/invalid entries. */
export function mapCustomScripts(
  src: PortalCustomScript[] | undefined,
): CustomScript[] | undefined {
  if (!src || src.length === 0) return undefined;
  const out: CustomScript[] = [];
  for (const s of src) {
    const hasSrc = typeof s.src === 'string' && s.src.trim() !== '';
    const hasInline =
      typeof s.inline_code === 'string' && s.inline_code.trim() !== '';
    if (!hasSrc && !hasInline) continue; // nothing to inject

    const placement: ScriptPlacement = SCRIPT_PLACEMENTS.has(
      s.placement as ScriptPlacement,
    )
      ? (s.placement as ScriptPlacement)
      : 'head';
    const loadingStrategy: ScriptLoadingStrategy =
      SCRIPT_LOADING_STRATEGIES.has(s.loading_strategy as ScriptLoadingStrategy)
        ? (s.loading_strategy as ScriptLoadingStrategy)
        : 'async';

    out.push({
      label: s.label ?? '',
      ...(hasSrc ? { src: s.src } : {}),
      ...(hasInline ? { inlineCode: s.inline_code } : {}),
      placement,
      loadingStrategy,
      enabled: s.enabled !== false, // default on
    });
  }
  return out.length > 0 ? out : undefined;
}

function mapBranding(src: PortalBranding | undefined): CompanyBranding {
  return {
    ...DEFAULT_HOME_SETTINGS.branding,
    title: src?.title || DEFAULT_HOME_SETTINGS.branding.title,
    ...(src?.logo_url ? { logo: src.logo_url } : {}),
    ...(src?.favicon_url ? { favicon: src.favicon_url } : {}),
    ...(src?.primary_color ? { primaryColor: src.primary_color } : {}),
    ...(src?.secondary_color ? { secondaryColor: src.secondary_color } : {}),
    ...(src?.accent_color ? { accentColor: src.accent_color } : {}),
  };
}

function mapMetaTags(src: PortalMetaTags | undefined): MetaTags | undefined {
  if (!src) return DEFAULT_HOME_SETTINGS.meta_tags;
  return {
    title: src.title,
    description: src.description,
    keywords: src.keywords,
    author: src.author,
    robots: src.robots,
    canonicalUrl: src.canonical_url,
    ogTitle: src.og_title,
    ogDescription: src.og_description,
    ogImage: src.og_image,
    ogSiteName: src.og_site_name,
    ogType: src.og_type,
    twitterCard: src.twitter_card,
    twitterSite: src.twitter_site,
    twitterCreator: src.twitter_creator,
    twitterImage: src.twitter_image,
    structuredData: src.structured_data,
    themeColor: src.theme_color,
    googleSiteVerification: src.google_site_verification,
    bingSiteVerification: src.bing_site_verification,
  };
}

const FOOTER_ITEM_TYPES = new Set(['text', 'link', 'image']);

function mapFooterItem(src: PortalFooterItem): FooterColumnItem | null {
  const type = src.type;
  if (!type || !FOOTER_ITEM_TYPES.has(type)) return null;
  return {
    type: type as FooterColumnItem['type'],
    textContent: src.text_content,
    imageUrl: src.image_url,
    imageAlt: src.image_alt,
    imageMaxWidth: src.image_max_width,
    label: src.label,
    href: src.href,
    openInNewTab: src.open_in_new_tab,
  };
}

function mapFooterColumn(src: PortalFooterColumn): FooterColumn {
  const items = src.items
    ?.map(mapFooterItem)
    .filter((it): it is FooterColumnItem => it !== null);
  const column: FooterColumn = {
    title: src.title ?? '',
    links: (src.links ?? []).map((l) => ({
      label: l.label ?? '',
      href: l.href ?? '#',
      openInNewTab: l.open_in_new_tab,
    })),
  };
  if (items && items.length > 0) column.items = items;
  return column;
}

export function mapFooter(
  src: PortalFooter | undefined,
): FooterConfig | undefined {
  if (!src) return undefined;
  return {
    columns: (src.columns ?? []).map(mapFooterColumn),
    socialLinks: (src.social_links ?? [])
      .filter((s) => s.platform && s.url)
      .map((s) => ({ platform: s.platform as string, url: s.url as string })),
    copyrightText: src.copyright_text,
    showNewsletter: src.show_newsletter,
    newsletterHeading: src.newsletter_heading,
    newsletterPlaceholder: src.newsletter_placeholder,
    bgColor: src.bg_color,
    textColor: src.text_color,
    footerHtml: src.footer_html,
    footerHtmlDraft: src.footer_html_draft,
  };
}

/**
 * Convert the PIM portal payload into a fully-populated `HomeSettings`.
 * Always returns a usable object; missing fields fall back to defaults.
 */
export function mapPortalToHomeSettings(
  portal: PortalPayload | undefined,
): HomeSettings {
  if (!portal) return DEFAULT_HOME_SETTINGS;

  const footer = mapFooter(portal.footer);

  return {
    ...DEFAULT_HOME_SETTINGS,
    companyName: portal.name,
    branding: mapBranding(portal.branding),
    headerConfig: portal.header_config ?? DEFAULT_HOME_SETTINGS.headerConfig,
    ...(portal.header_config_draft && {
      headerConfigDraft: portal.header_config_draft,
    }),
    meta_tags: mapMetaTags(portal.meta_tags),
    customScripts: mapCustomScripts(portal.custom_scripts),
    ...(portal.custom_css?.trim() ? { customCss: portal.custom_css } : {}),
    footer: footer ?? DEFAULT_HOME_SETTINGS.footer,
    // Merge any portal-supplied cardStyle over the defaults so a partial
    // payload (e.g. just `priceDecimals: 4`) keeps the rest of the defaults
    // intact. When the portal doesn't ship cardStyle this is a no-op.
    cardStyle: {
      ...DEFAULT_HOME_SETTINGS.cardStyle,
      ...(portal.cardStyle ?? {}),
    },
    // Keep the legacy top-level fields populated for any straggler consumers.
    footerHtml: portal.footer?.footer_html,
    footerHtmlDraft: portal.footer?.footer_html_draft,
  };
}
