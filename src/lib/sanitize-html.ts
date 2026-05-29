/**
 * HTML Sanitization Utilities
 * Centralized configuration to prevent XSS attacks.
 *
 * Uses `sanitize-html` (htmlparser2-based, DOM-free) instead of DOMPurify so it
 * runs identically in Node (SSR + server components) and the browser (client
 * components) — no `window`/jsdom requirement, and identical output on both
 * sides, so `dangerouslySetInnerHTML` never hydration-mismatches.
 */

import sanitizeHtmlLib, { type IOptions } from 'sanitize-html';

export type Config = IOptions;

/** Tags allowed by the default config. */
const DEFAULT_ALLOWED_TAGS = [
  // Text formatting
  'b',
  'i',
  'u',
  's',
  'strong',
  'em',
  'mark',
  'small',
  'sub',
  'sup',
  // Structure
  'p',
  'br',
  'hr',
  'div',
  'span',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'nav',
  'aside',
  // Headings
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // Lists
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  // Links and media
  'a',
  'img',
  'picture',
  'source',
  'video',
  'audio',
  // Tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  // Other
  'blockquote',
  'pre',
  'code',
  'figure',
  'figcaption',
  'address',
  'time',
  // Forms (display only)
  'button',
  'label',
];

/** Attributes allowed on any tag by the default config. `data-*`/`aria-*`
 * wildcards are supported natively by sanitize-html. Event handler attributes
 * (onclick, onerror, …) are dropped because they are not listed here. */
const DEFAULT_ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'class',
  'id',
  'name',
  'width',
  'height',
  'style',
  'target',
  'rel',
  'colspan',
  'rowspan',
  'type',
  'controls',
  'autoplay',
  'loop',
  'muted',
  'playsinline',
  'loading',
  'decoding',
  'srcset',
  'sizes',
  'data-*',
  'aria-*',
  'role',
];

/**
 * Default sanitization configuration. Disallowed tags are discarded; `script`,
 * `style`, `iframe`, `object`, `embed`, and form-input tags are absent from the
 * allow-list so they (and `script`/`style` content) are removed.
 */
const DEFAULT_CONFIG: IOptions = {
  allowedTags: DEFAULT_ALLOWED_TAGS,
  allowedAttributes: { '*': DEFAULT_ALLOWED_ATTR },
  disallowedTagsMode: 'discard',
  // Keep relative + common schemes; strip javascript: etc.
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
};

/**
 * Strict config - minimal tags for simple text content.
 */
const STRICT_CONFIG: IOptions = {
  allowedTags: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span', 'a'],
  allowedAttributes: { '*': ['href', 'target', 'rel', 'class'] },
  disallowedTagsMode: 'discard',
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

/**
 * Sanitize HTML content with default configuration.
 */
export function sanitizeHtml(
  html: string | undefined | null,
  config: IOptions = DEFAULT_CONFIG,
): string {
  if (!html) return '';
  return sanitizeHtmlLib(html, config);
}

/**
 * Sanitize HTML with strict rules (minimal tags).
 */
export function sanitizeHtmlStrict(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtmlLib(html, STRICT_CONFIG);
}

/**
 * Strip all HTML tags, return plain text.
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtmlLib(html, { allowedTags: [], allowedAttributes: {} });
}

export { DEFAULT_CONFIG, STRICT_CONFIG };
