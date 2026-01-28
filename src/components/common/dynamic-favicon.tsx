'use client';

import * as React from 'react';
import { useHomeSettingsContext } from '@contexts/home-settings.context';

const DEFAULT_FAVICON = '/assets/vinc/favicon.svg';
const DEFAULT_TITLE = 'B2B Store';

/**
 * Dynamically updates the browser favicon and title from HomeSettings.
 * Similar to how the Logo component works - uses context to get branding.
 */
export function DynamicFavicon() {
  const homeSettings = useHomeSettingsContext();
  const branding = homeSettings?.settings?.branding;
  const metaTags = homeSettings?.settings?.meta_tags;

  React.useEffect(() => {
    // Update favicon
    const faviconUrl = branding?.favicon || DEFAULT_FAVICON;
    updateFavicon(faviconUrl);

    // Update title (only the base title, not the full page title)
    const title = metaTags?.title || branding?.title || DEFAULT_TITLE;
    updateBaseTitle(title);
  }, [branding?.favicon, branding?.title, metaTags?.title]);

  return null;
}

/**
 * Update all favicon link elements in the document head
 */
function updateFavicon(url: string) {
  if (typeof document === 'undefined') return;

  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
  ];

  selectors.forEach((selector) => {
    const links = document.querySelectorAll<HTMLLinkElement>(selector);
    if (links.length > 0) {
      links.forEach((link) => {
        link.href = url;
      });
    } else {
      // Create the link if it doesn't exist
      const newLink = document.createElement('link');
      newLink.rel = selector.match(/rel="([^"]+)"/)?.[1] || 'icon';
      newLink.href = url;
      document.head.appendChild(newLink);
    }
  });
}

/**
 * Update the document title base (preserves page-specific title if present)
 */
function updateBaseTitle(baseTitle: string) {
  if (typeof document === 'undefined') return;

  const currentTitle = document.title;

  // If the title has a separator (|), update only the base part
  if (currentTitle.includes(' | ')) {
    const parts = currentTitle.split(' | ');
    parts[parts.length - 1] = baseTitle;
    document.title = parts.join(' | ');
  } else if (
    !currentTitle ||
    currentTitle === DEFAULT_TITLE ||
    currentTitle === 'VINC - B2B'
  ) {
    // Set the base title if empty or default
    document.title = baseTitle;
  }
}

export default DynamicFavicon;
