'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  HiOutlineXMark,
  HiOutlineBell,
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineTag,
  HiOutlineCube,
  HiOutlineSparkles,
  HiOutlineNewspaper,
  HiOutlineCalendar,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineClock,
} from 'react-icons/hi2';
import type { IconType } from 'react-icons';
import { useTranslation } from 'src/app/i18n/client';
import {
  trackNotification,
  type NotificationItem,
  type NotificationTrigger,
} from '@framework/notifications';

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
  onDelete: (id: string) => void;
  lang: string;
}

// Trigger configuration for badges
const TRIGGER_CONFIG: Record<
  string,
  { label: string; icon: IconType; bgColor: string; textColor: string }
> = {
  order_confirmation: {
    label: 'Ordine Confermato',
    icon: HiOutlineShoppingCart,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  order_shipped: {
    label: 'Ordine Spedito',
    icon: HiOutlineTruck,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  order_delivered: {
    label: 'Ordine Consegnato',
    icon: HiOutlineCheckCircle,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  order_cancelled: {
    label: 'Ordine Annullato',
    icon: HiOutlineXCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  price_drop_alert: {
    label: 'Prezzo Ribassato',
    icon: HiOutlineTag,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  back_in_stock: {
    label: 'Disponibile',
    icon: HiOutlineCube,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  abandoned_cart: {
    label: 'Carrello',
    icon: HiOutlineShoppingCart,
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  welcome: {
    label: 'Benvenuto',
    icon: HiOutlineSparkles,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  newsletter: {
    label: 'Newsletter',
    icon: HiOutlineNewspaper,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
};

const DEFAULT_TRIGGER_CONFIG = {
  label: 'Notifica',
  icon: HiOutlineBell,
  bgColor: 'bg-gray-100',
  textColor: 'text-gray-700',
};

function getTriggerConfig(trigger: NotificationTrigger) {
  return TRIGGER_CONFIG[trigger] || DEFAULT_TRIGGER_CONFIG;
}

/**
 * Build navigation URL for "See All" / main action button
 * - Product/Price category: Use products_url field (e.g., "search?text=condizionatore")
 * - Order category: Navigate to order detail page
 * - Generic category: Use url field for external links
 */
function buildNavigationUrl(
  notification: NotificationItem,
  lang: string,
): string | null {
  // If action_url is provided, use it directly
  if (notification.action_url) {
    return notification.action_url;
  }

  const payload = notification.payload;
  if (!payload) return null;

  // Order category - navigate to order detail
  if (payload.category === 'order' && payload.order?.item_ref) {
    return `/${lang}/account/orders/${payload.order.item_ref}`;
  }

  // Product category - use products_url for "See All"
  if (payload.category === 'product') {
    // Priority 1: Use products_url if available (e.g., "search?text=condizionatore")
    if (payload.products_url) {
      // Prepend language to the URL
      return `/${lang}/${payload.products_url.replace(/^\//, '')}`;
    }

    // Priority 2: Use filters object if available
    if (payload.filters && Object.keys(payload.filters).length > 0) {
      const params = new URLSearchParams();
      for (const [key, values] of Object.entries(payload.filters)) {
        if (values && values.length > 0) {
          params.set(`filters-${key}`, values.join(';'));
        }
      }
      return `/${lang}/search?${params.toString()}`;
    }

    // Priority 3: Fallback to SKUs from products
    if (payload.products?.length) {
      const productsWithSku = payload.products.filter((p) => p.sku);
      if (productsWithSku.length === 0) return null;

      if (productsWithSku.length === 1) {
        return `/${lang}/products?sku=${productsWithSku[0].sku}`;
      } else {
        const skus = productsWithSku.map((p) => p.sku).join(';');
        return `/${lang}/search?filters-sku=${skus}`;
      }
    }
  }

  // Price category - use products_url for "See All"
  if (payload.category === 'price') {
    // Priority 1: Use products_url if available
    if (payload.products_url) {
      return `/${lang}/${payload.products_url.replace(/^\//, '')}`;
    }

    // Priority 2: Use filters object if available
    if (payload.filters && Object.keys(payload.filters).length > 0) {
      const params = new URLSearchParams();
      for (const [key, values] of Object.entries(payload.filters)) {
        if (values && values.length > 0) {
          params.set(`filters-${key}`, values.join(';'));
        }
      }
      return `/${lang}/search?${params.toString()}`;
    }

    // Priority 3: Fallback to SKUs from products
    if (payload.products?.length) {
      const productsWithSku = payload.products.filter((p) => p.sku);
      if (productsWithSku.length === 0) return null;

      if (productsWithSku.length === 1) {
        return `/${lang}/products?sku=${productsWithSku[0].sku}`;
      } else {
        const skus = productsWithSku.map((p) => p.sku).join(';');
        return `/${lang}/search?filters-sku=${skus}`;
      }
    }
  }

  // Generic category - use url field for external links (catalogs, documents)
  if (payload.category === 'generic' && payload.url) {
    return payload.url;
  }

  return null;
}

/**
 * Check if navigation should open in new tab (for external URLs)
 */
function shouldOpenInNewTab(notification: NotificationItem): boolean {
  const payload = notification.payload;

  // Generic category with url - check open_in_new_tab (default true for external URLs)
  if (payload?.category === 'generic' && payload.url) {
    return payload.open_in_new_tab !== false; // Default to true
  }

  // External action_url should open in new tab
  if (notification.action_url) {
    try {
      const url = new URL(notification.action_url);
      return url.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  return false;
}

export function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onNavigate,
  onDelete,
  lang,
}: NotificationDetailModalProps) {
  const { t } = useTranslation(lang, 'common');
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Close on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Track notification opened event
  React.useEffect(() => {
    const logId = notification?.payload?.notification_log_id;
    if (isOpen && logId) {
      trackNotification(logId, 'opened').catch(() => {});
    }
  }, [isOpen, notification?.payload?.notification_log_id]);

  // Close on outside click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !notification) return null;

  const triggerConfig = getTriggerConfig(notification.trigger);
  const TriggerIcon = triggerConfig.icon;
  const payload = notification.payload;

  // Get product items to display as cards
  const getProductItems = (): Array<{
    name: string;
    image?: string;
    sku?: string;
    item_ref?: string;
  }> => {
    // Product category - products array
    if (payload?.category === 'product' && payload.products) {
      return payload.products.slice(0, 6);
    }

    // Order category - order items
    if (payload?.category === 'order' && payload.order?.items) {
      return payload.order.items.slice(0, 6);
    }

    // Price category - products with pricing
    if (payload?.category === 'price' && payload.products) {
      return payload.products.slice(0, 6);
    }

    return [];
  };

  // Handle product item click - navigate to product detail by SKU
  const handleProductClick = (item: { sku?: string }) => {
    if (!item.sku) return;

    // Track click event if notification_log_id exists
    const logId = notification.payload?.notification_log_id;
    if (logId) {
      trackNotification(logId, 'clicked', {
        type: 'product',
        sku: item.sku,
        screen: 'product_detail',
      }).catch(() => {});
    }

    onNavigate(`/${lang}/products?sku=${item.sku}`);
    onClose();
  };

  // Get media images for generic category
  const getMediaImages = (): string[] => {
    // Generic category - media
    if (payload?.category === 'generic' && payload.media) {
      if (payload.media.images?.length) {
        return payload.media.images.slice(0, 4);
      }
      if (payload.media.image) {
        return [payload.media.image];
      }
    }

    // Fallback to notification icon for generic category
    if (payload?.category === 'generic' && notification.icon) {
      return [notification.icon];
    }

    return [];
  };

  const productItems = getProductItems();
  const mediaImages = getMediaImages();
  const navigationUrl = buildNavigationUrl(notification, lang);

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: it,
      });
    } catch {
      return '';
    }
  };

  const handleActionClick = () => {
    if (navigationUrl) {
      // Track click event if notification_log_id exists
      const logId = payload?.notification_log_id;
      if (logId) {
        // Determine click type based on payload category
        const clickType =
          payload?.category === 'order'
            ? 'order'
            : payload?.category === 'generic'
              ? 'link'
              : 'product';

        trackNotification(logId, 'clicked', {
          type: clickType,
          url: navigationUrl,
          ...(payload?.category === 'order' && payload.order?.number
            ? { order_number: payload.order.number }
            : {}),
        }).catch(() => {});
      }

      // Check if should open in new tab (external URLs, documents, etc.)
      if (shouldOpenInNewTab(notification)) {
        window.open(navigationUrl, '_blank', 'noopener,noreferrer');
      } else {
        onNavigate(navigationUrl);
      }
      onClose();
    }
  };

  // Get action button label based on category
  const getActionLabel = (): string => {
    if (payload?.category === 'order') {
      if (payload.order?.tracking_code) {
        return t('text-track-shipment', { defaultValue: 'Traccia Spedizione' });
      }
      return t('text-view-order', { defaultValue: 'Visualizza Ordine' });
    }
    if (payload?.category === 'product') {
      const productsWithRef = payload.products?.filter((p) => p.item_ref) || [];
      if (productsWithRef.length > 1) {
        return t('text-view-products', { defaultValue: 'Vai ai Prodotti' });
      }
      return t('text-view-product', { defaultValue: 'Vai al Prodotto' });
    }
    if (payload?.category === 'price') {
      const productsWithRef = payload.products?.filter((p) => p.item_ref) || [];
      if (productsWithRef.length > 1) {
        return t('text-view-offers', { defaultValue: 'Vai alle Offerte' });
      }
      return t('text-view-offer', { defaultValue: "Vai all'Offerta" });
    }
    if (payload?.category === 'generic' && payload.url) {
      // Check if it's a PDF or document
      const url = payload.url.toLowerCase();
      if (url.endsWith('.pdf')) {
        return t('text-open-document', { defaultValue: 'Apri Documento' });
      }
      return t('text-open-link', { defaultValue: 'Apri Link' });
    }
    return t('text-view-details', { defaultValue: 'Visualizza' });
  };

  // Check if price payload has expiry
  const hasExpiry = payload?.category === 'price' && payload.expires_at;
  const isExpired = hasExpiry && new Date(payload.expires_at!) < new Date();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
        >
          <HiOutlineXMark className="w-5 h-5 text-gray-600" />
        </button>

        {/* Product cards section - for product/order/price categories */}
        {productItems.length > 0 && (
          <div className="bg-gray-50 p-4">
            <div
              className={`grid gap-3 ${
                productItems.length === 1
                  ? 'grid-cols-1 max-w-[200px] mx-auto'
                  : productItems.length === 2
                    ? 'grid-cols-2 max-w-[400px] mx-auto'
                    : 'grid-cols-3'
              }`}
            >
              {productItems.map((item, i) => {
                const isClickable = !!item.sku;
                return (
                  <div
                    key={i}
                    onClick={
                      isClickable ? () => handleProductClick(item) : undefined
                    }
                    className={`bg-white rounded-lg overflow-hidden shadow-sm ${
                      isClickable
                        ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-brand/20 transition-all'
                        : ''
                    }`}
                  >
                    {item.image ? (
                      <div className="aspect-square bg-gray-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <HiOutlineCube className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs text-gray-700 line-clamp-2 text-center">
                        {item.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Media images section - for generic category */}
        {mediaImages.length > 0 && productItems.length === 0 && (
          <div className="relative bg-gray-100">
            {mediaImages.length === 1 ? (
              <img
                src={mediaImages[0]}
                alt=""
                className="w-full h-48 object-contain"
              />
            ) : (
              <div className="grid grid-cols-2 gap-1 p-1">
                {mediaImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="w-full h-24 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${triggerConfig.bgColor} ${triggerConfig.textColor} text-xs font-medium mb-3`}
          >
            <TriggerIcon className="w-3.5 h-3.5" />
            {triggerConfig.label}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {notification.title}
          </h3>

          {/* Body */}
          <p className="text-sm text-gray-600 mb-4">{notification.body}</p>

          {/* Price category - discount info (label + expiry only) */}
          {payload?.category === 'price' &&
            (payload.discount_label || hasExpiry) && (
              <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                {payload.discount_label && (
                  <div className="text-sm font-medium text-orange-700">
                    {payload.discount_label}
                  </div>
                )}
                {hasExpiry && (
                  <div
                    className={`flex items-center gap-1.5 ${payload.discount_label ? 'mt-2' : ''} text-xs ${isExpired ? 'text-red-600' : 'text-orange-600'}`}
                  >
                    <HiOutlineClock className="w-3.5 h-3.5" />
                    {isExpired
                      ? t('text-offer-expired', {
                          defaultValue: 'Offerta scaduta',
                        })
                      : t('text-offer-expires', {
                          defaultValue: 'Scade',
                        }) +
                        ' ' +
                        formatTimestamp(payload.expires_at!)}
                  </div>
                )}
              </div>
            )}

          {/* Order details */}
          {payload?.category === 'order' && payload.order && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              {payload.order.number && (
                <div className="flex justify-between text-gray-600">
                  <span>
                    {t('text-order-number', { defaultValue: 'Numero Ordine' })}
                  </span>
                  <span className="font-medium text-gray-900">
                    #{payload.order.number}
                  </span>
                </div>
              )}
              {payload.order.total && (
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>{t('text-total', { defaultValue: 'Totale' })}</span>
                  <span className="font-medium text-gray-900">
                    {payload.order.total}
                  </span>
                </div>
              )}
              {payload.order.carrier && (
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>{t('text-carrier', { defaultValue: 'Corriere' })}</span>
                  <span className="font-medium text-gray-900">
                    {payload.order.carrier}
                  </span>
                </div>
              )}
              {payload.order.tracking_code && (
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>
                    {t('text-tracking-code', {
                      defaultValue: 'Codice Tracking',
                    })}
                  </span>
                  <span className="font-medium text-gray-900">
                    {payload.order.tracking_code}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <HiOutlineCalendar className="w-3.5 h-3.5" />
            {formatTimestamp(notification.created_at)}
          </div>

          {/* Action button */}
          {navigationUrl && (
            <button
              onClick={handleActionClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors font-medium"
            >
              {getActionLabel()}
              <HiOutlineArrowTopRightOnSquare className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
