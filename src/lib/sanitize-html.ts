/**
 * HTML Sanitization Utilities
 * Centralized DOMPurify configuration to prevent XSS attacks
 */

'use client';

import DOMPurify, { Config } from 'dompurify';

/**
 * Default sanitization configuration
 */
const DEFAULT_CONFIG: Config = {
  ALLOWED_TAGS: [
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
  ],
  ALLOWED_ATTR: [
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
  ],
  FORBID_TAGS: [
    'script',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'textarea',
    'select',
  ],
  FORBID_ATTR: [
    'onerror',
    'onclick',
    'onload',
    'onmouseover',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
  ],
  ALLOW_DATA_ATTR: true,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Strict config - minimal tags for simple text content
 */
const STRICT_CONFIG: Config = {
  ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload'],
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Sanitize HTML content with default configuration
 */
export function sanitizeHtml(
  html: string | undefined | null,
  config: Config = DEFAULT_CONFIG,
): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ...config,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}

/**
 * Sanitize HTML with strict rules (minimal tags)
 */
export function sanitizeHtmlStrict(html: string | undefined | null): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, STRICT_CONFIG) as string;
}

/**
 * Strip all HTML tags, return plain text
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}

export { DEFAULT_CONFIG, STRICT_CONFIG };
export type { Config };
