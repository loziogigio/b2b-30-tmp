import type { HomeSettings, HeaderConfig } from '@/lib/home-settings/types';

/**
 * Default header configuration matching current hardcoded header structure.
 * Row 1: Logo | Search + Radio | User icons (20-60-20)
 * Row 2: Categories + Buttons | Delivery | Cart (25-50-25)
 */
export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  rows: [
    {
      id: 'primary',
      enabled: true,
      fixed: true,
      backgroundColor: '#ffffff',
      layout: '20-60-20',
      blocks: [
        {
          id: 'left',
          alignment: 'left',
          widgets: [{ id: 'logo', type: 'logo', config: {} }],
        },
        {
          id: 'center',
          alignment: 'center',
          widgets: [
            { id: 'search', type: 'search-bar', config: {} },
            {
              id: 'radio',
              type: 'radio-widget',
              config: {
                enabled: true,
              },
            },
          ],
        },
        {
          id: 'right',
          alignment: 'right',
          widgets: [
            { id: 'no-price', type: 'no-price', config: { showLabel: true } },
            { id: 'favorites', type: 'favorites', config: { showLabel: true } },
            { id: 'compare', type: 'compare', config: { showLabel: true } },
            { id: 'profile', type: 'profile', config: { showLabel: true } },
          ],
        },
      ],
    },
    {
      id: 'secondary',
      enabled: true,
      fixed: true,
      backgroundColor: '#ffffff',
      layout: '25-50-25',
      blocks: [
        {
          id: 'left',
          alignment: 'left',
          widgets: [
            {
              id: 'categories',
              type: 'category-menu',
              config: { label: 'Categorie' },
            },
            {
              id: 'promo',
              type: 'button',
              config: {
                label: 'Promozioni',
                url: '/search?filters-has_active_promo=true',
                variant: 'primary',
              },
            },
            {
              id: 'new-arrivals',
              type: 'button',
              config: {
                label: 'Nuovi arrivi',
                url: '/search?filters-attribute_is_new_b=true',
                variant: 'secondary',
              },
            },
          ],
        },
        {
          id: 'center',
          alignment: 'center',
          widgets: [
            { id: 'delivery', type: 'company-info', config: {} },
            {
              id: 'orders-link',
              type: 'button',
              config: {
                label: 'i miei ordini',
                url: '/account/orders',
                variant: 'outline',
              },
            },
            {
              id: 'docs-link',
              type: 'button',
              config: {
                label: 'i miei documenti',
                url: '/account/documents',
                variant: 'outline',
              },
            },
          ],
        },
        {
          id: 'right',
          alignment: 'right',
          widgets: [{ id: 'cart', type: 'cart', config: { showLabel: false } }],
        },
      ],
    },
  ],
};

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  branding: {
    title: 'B2B Store',
    logo: '/assets/images/logo-placeholder.svg',
    favicon: '/assets/vinc/favicon.svg',
    primaryColor: '#009f7f',
    secondaryColor: '#02b290',
    // Extended theme colors with sensible defaults
    textColor: '#000000',
    mutedColor: '#595959',
    backgroundColor: '#ffffff',
    footerBackgroundColor: '#f5f5f5',
    footerTextColor: '#666666',
  },
  defaultCardVariant: 'b2b',
  cardStyle: {
    borderWidth: 1,
    borderColor: '#EAEEF2',
    borderStyle: 'solid',
    shadowSize: 'none',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 'md',
    hoverEffect: 'none',
    backgroundColor: '#ffffff',
  },
  headerConfig: DEFAULT_HEADER_CONFIG,
  // Default SEO meta tags - will be overridden by tenant settings
  meta_tags: {
    title: 'B2B Store',
    description: 'B2B E-Commerce Platform',
    ogType: 'website',
    twitterCard: 'summary_large_image',
  },
};
