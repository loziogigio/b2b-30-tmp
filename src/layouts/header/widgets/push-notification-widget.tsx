'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  HiOutlineBell,
  HiOutlineBellSlash,
  HiOutlineCheck,
  HiOutlineCog6Tooth,
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineTag,
  HiOutlineCube,
  HiOutlineSparkles,
  HiOutlineNewspaper,
  HiXMark,
} from 'react-icons/hi2';
import type { IconType } from 'react-icons';
import { toast } from 'react-toastify';
import { useUI } from '@contexts/ui.context';
import { usePushNotifications } from '@contexts/push-notifications';
import { useTranslation } from 'src/app/i18n/client';
// Note: useClickOutside removed - portal-based panel uses backdrop click instead
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
  type NotificationTrigger,
} from '@framework/notifications';
import type { WidgetConfig } from '@/lib/home-settings/types';
import { NotificationDetailModal } from '@/components/notifications/notification-detail-modal';
import { deleteNotification } from '@framework/notifications';

interface PushNotificationWidgetProps {
  config: WidgetConfig;
  lang: string;
}

type TabType = 'notifications' | 'settings';

// Trigger-based icon configuration
const TRIGGER_ICONS: Record<
  string,
  { icon: IconType; bgColor: string; iconColor: string }
> = {
  order_confirmation: {
    icon: HiOutlineShoppingCart,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  order_shipped: {
    icon: HiOutlineTruck,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  order_delivered: {
    icon: HiOutlineCheckCircle,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  order_cancelled: {
    icon: HiOutlineXCircle,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  price_drop_alert: {
    icon: HiOutlineTag,
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  back_in_stock: {
    icon: HiOutlineCube,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  abandoned_cart: {
    icon: HiOutlineShoppingCart,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  welcome: {
    icon: HiOutlineSparkles,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  newsletter: {
    icon: HiOutlineNewspaper,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
};

const DEFAULT_TRIGGER_ICON = {
  icon: HiOutlineBell,
  bgColor: 'bg-gray-100',
  iconColor: 'text-gray-600',
};

function getTriggerIcon(trigger: NotificationTrigger) {
  return TRIGGER_ICONS[trigger] || DEFAULT_TRIGGER_ICON;
}

type NotificationIconResult =
  | { type: 'image'; src: string }
  | { type: 'trigger'; icon: IconType; bgColor: string; iconColor: string };

function getNotificationIcon(
  notification: NotificationItem,
): NotificationIconResult {
  // Priority 1: Custom icon field
  if (notification.icon) {
    return { type: 'image', src: notification.icon };
  }

  // Priority 2: First product image from payload
  const payload = notification.payload;

  // Product category - products array
  if (payload?.category === 'product' && payload.products?.[0]?.image) {
    return { type: 'image', src: payload.products[0].image };
  }

  // Order category - order items
  if (payload?.category === 'order' && payload.order?.items?.[0]?.image) {
    return { type: 'image', src: payload.order.items[0].image };
  }

  // Price category - products with pricing
  if (payload?.category === 'price' && payload.products?.[0]?.image) {
    return { type: 'image', src: payload.products[0].image };
  }

  // Generic category - media (icon or image)
  if (payload?.category === 'generic' && payload.media) {
    if (payload.media.icon) {
      return { type: 'image', src: payload.media.icon };
    }
    if (payload.media.image) {
      return { type: 'image', src: payload.media.image };
    }
  }

  // Fallback: Trigger-based icon
  return { type: 'trigger', ...getTriggerIcon(notification.trigger) };
}

export function PushNotificationWidget({
  config,
  lang,
}: PushNotificationWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const router = useRouter();
  const { isAuthorized } = useUI();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: isPushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabType>('notifications');
  const [filter, setFilter] = React.useState<'all' | 'unread'>('unread');
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] =
    React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] =
    React.useState<NotificationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Refs for preventing state updates after unmount and aborting in-flight requests
  const isMountedRef = React.useRef(true);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // For SSR compatibility with portal + cleanup
  React.useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch notifications when panel opens
  React.useEffect(() => {
    if (
      isOpen &&
      activeTab === 'notifications' &&
      isSubscribed &&
      isAuthorized
    ) {
      fetchNotifications();
    }
  }, [isOpen, activeTab, isSubscribed, isAuthorized]);

  // Periodically refresh unread count when subscribed (fallback, every 60s)
  // Add a small delay on initial fetch to avoid race condition with auth cookies after login
  React.useEffect(() => {
    if (!isSubscribed || !isAuthorized) return;

    // Delay first fetch to allow auth system to settle after login
    const initialDelay = setTimeout(() => {
      fetchUnreadCount();
    }, 1000);

    const interval = setInterval(fetchUnreadCount, 60000);
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isSubscribed, isAuthorized]);

  // Real-time updates: Listen for Service Worker push messages
  React.useEffect(() => {
    if (!isSubscribed || !isAuthorized) return;
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[PushWidget] Real-time notification received:',
            event.data.payload,
          );
        }
        // Increment unread count immediately
        setUnreadCount((prev) => prev + 1);
        // If panel is open, refetch to show the new notification
        if (isOpen) {
          fetchNotifications();
        }
      }
    };

    navigator.serviceWorker.addEventListener(
      'message',
      handleServiceWorkerMessage,
    );
    return () => {
      navigator.serviceWorker.removeEventListener(
        'message',
        handleServiceWorkerMessage,
      );
    };
  }, [isSubscribed, isAuthorized, isOpen]);

  const fetchNotifications = async () => {
    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoadingNotifications(true);
    setFetchError(null);
    try {
      const response = await getNotifications({
        limit: 20,
        signal: abortControllerRef.current.signal,
      });

      // Don't update state if unmounted
      if (!isMountedRef.current) return;

      if (response.success) {
        setNotifications(response.notifications);
        setUnreadCount(response.unread_count);
      }
    } catch (err: unknown) {
      // Ignore aborted requests
      if (err instanceof Error && err.name === 'CanceledError') return;
      if (!isMountedRef.current) return;

      const axiosError = err as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        setFetchError('Sessione scaduta. Effettua nuovamente il login.');
      } else {
        setFetchError('Errore nel caricamento delle notifiche');
        console.error('[PushWidget] Failed to fetch notifications:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingNotifications(false);
      }
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await getNotifications({ limit: 1 });
      // Don't update state if unmounted
      if (!isMountedRef.current) return;
      if (response.success) {
        setUnreadCount(response.unread_count);
      }
    } catch {
      // Silently ignore errors (including 401, aborted requests)
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === id ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[PushWidget] Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[PushWidget] Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.notification_id);
    }
    setSelectedNotification(notification);
    setIsModalOpen(true);
    setIsOpen(false);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedNotification(null);
  };

  const handleModalNavigate = (url: string) => {
    router.push(url);
    handleModalClose();
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
      handleModalClose();
    } catch (err) {
      console.error('[PushWidget] Failed to delete notification:', err);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    setActiveTab('notifications');
  };

  const handleToggleSubscription = async () => {
    if (isPushLoading) return;

    if (isSubscribed) {
      const result = await unsubscribe();
      if (result.success) {
        toast.success(
          t('text-notifications-disabled', {
            defaultValue: 'Notifiche disattivate',
          }),
        );
      } else if (result.error) {
        toast.error(result.error);
      }
    } else {
      const result = await subscribe();
      if (result.success) {
        toast.success(
          t('text-notifications-enabled', {
            defaultValue: 'Notifiche attivate',
          }),
        );
      } else if (result.error) {
        toast.error(result.error);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: false,
        locale: it,
      });
    } catch {
      return '';
    }
  };

  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  // Only show when logged in and browser supports push
  if (!isAuthorized || !isSupported) return null;

  // Don't show if permission was denied
  if (permission === 'denied') return null;

  return (
    <div className="relative flex items-center">
      {/* Bell Icon */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={handleBellClick}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border shrink-0 transition-colors ${
            isSubscribed
              ? 'border-brand text-brand hover:border-brand-dark hover:text-brand-dark'
              : 'border-slate-200 text-slate-400 hover:border-slate-300'
          }`}
          title={t('text-view-notifications', { defaultValue: 'Notifiche' })}
        >
          {isSubscribed ? (
            <HiOutlineBell className="h-5 w-5" />
          ) : (
            <HiOutlineBellSlash className="h-5 w-5" />
          )}
          {isSubscribed && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        {config?.showLabel && (
          <span className="mt-1 text-[10px] text-slate-500">
            {t('text-notifications', { defaultValue: 'Notifiche' })}
          </span>
        )}
      </div>

      {/* Side Panel (ELIA style) - rendered via portal to stay above everything */}
      {isOpen &&
        mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Side Panel - anchored to top-right */}
            <div className="fixed top-0 right-0 w-[420px] h-screen max-h-screen z-[9999] bg-white shadow-2xl flex flex-col">
              {/* Blue Header (ELIA style) */}
              <div className="bg-brand px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HiOutlineBell className="w-5 h-5 text-white" />
                  <div>
                    <h2 className="text-white font-semibold text-base">
                      {t('text-notifications', { defaultValue: 'Notifiche' })}
                    </h2>
                    <p className="text-white/70 text-xs">
                      {t('text-notifications-subtitle', {
                        defaultValue: 'Aggiornamenti su ordini e prodotti',
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <HiXMark className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`text-sm font-semibold transition-colors ${
                      activeTab === 'notifications'
                        ? 'text-brand'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {t('text-notifications', { defaultValue: 'Notifiche' })}
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-1 text-sm font-semibold transition-colors ${
                      activeTab === 'settings'
                        ? 'text-brand'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <HiOutlineCog6Tooth className="w-4 h-4" />
                    {t('text-settings', { defaultValue: 'Impostazioni' })}
                  </button>
                </div>
                {activeTab === 'notifications' &&
                  isSubscribed &&
                  unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="flex items-center gap-1 text-xs text-brand hover:text-brand-dark"
                    >
                      <HiOutlineCheck className="w-4 h-4" />
                      {t('text-mark-all-read', { defaultValue: 'Segna lette' })}
                    </button>
                  )}
              </div>

              {/* Content based on active tab */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'notifications' ? (
                  !isSubscribed ? (
                    // Not subscribed - show enable prompt
                    <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                      <div className="relative mb-6">
                        <HiOutlineBell className="w-16 h-16 text-brand/30" />
                        <HiOutlineSparkles className="w-6 h-6 text-brand absolute -top-1 -right-1" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {t('text-notifications-disabled-title', {
                          defaultValue: 'Notifiche disattivate',
                        })}
                      </h3>
                      <p className="text-sm text-gray-500 mb-6 max-w-sm">
                        {t('text-notifications-disabled-desc', {
                          defaultValue:
                            'Attiva le notifiche per ricevere aggiornamenti su ordini e prodotti',
                        })}
                      </p>
                      <button
                        onClick={handleToggleSubscription}
                        disabled={isPushLoading}
                        className="px-6 py-2.5 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 font-medium"
                      >
                        {isPushLoading
                          ? t('text-loading', {
                              defaultValue: 'Caricamento...',
                            })
                          : t('text-enable-notifications', {
                              defaultValue: 'Attiva notifiche',
                            })}
                      </button>
                    </div>
                  ) : (
                    // Subscribed - show notification list
                    <>
                      {/* Filter Tabs */}
                      <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
                        <button
                          onClick={() => setFilter('unread')}
                          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                            filter === 'unread'
                              ? 'bg-brand/10 text-brand'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {t('text-unread', { defaultValue: 'Non lette' })}
                        </button>
                        <button
                          onClick={() => setFilter('all')}
                          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                            filter === 'all'
                              ? 'bg-brand/10 text-brand'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {t('text-all', { defaultValue: 'Tutte' })}
                        </button>
                      </div>

                      {/* Notifications List */}
                      <div>
                        {fetchError ? (
                          <div className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[300px]">
                            <div className="w-14 h-14 mb-4 rounded-full bg-red-100 flex items-center justify-center">
                              <HiOutlineBell className="w-7 h-7 text-red-500" />
                            </div>
                            <p className="text-sm text-red-600 mb-4">
                              {fetchError}
                            </p>
                            <button
                              onClick={() => {
                                setFetchError(null);
                                fetchNotifications();
                              }}
                              className="px-5 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                            >
                              {t('text-retry', { defaultValue: 'Riprova' })}
                            </button>
                          </div>
                        ) : isLoadingNotifications ? (
                          <div className="flex items-center justify-center py-16 min-h-[300px]">
                            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : filteredNotifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 min-h-[300px]">
                            <div className="relative mb-6">
                              <HiOutlineBell className="w-16 h-16 text-gray-200" />
                              <HiOutlineSparkles className="w-6 h-6 text-brand/50 absolute -top-1 -right-1" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 mb-1">
                              {filter === 'unread'
                                ? t('text-no-unread-notifications', {
                                    defaultValue: 'Nessuna notifica non letta',
                                  })
                                : t('text-no-notifications', {
                                    defaultValue: 'Nessuna notifica',
                                  })}
                            </p>
                            <p className="text-sm text-gray-500">
                              {t('text-notifications-will-appear', {
                                defaultValue:
                                  'Le tue notifiche appariranno qui',
                              })}
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {filteredNotifications.map((notification) => (
                              <button
                                key={notification.notification_id}
                                onClick={() =>
                                  handleNotificationClick(notification)
                                }
                                className={`w-full flex items-start gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors ${
                                  !notification.is_read ? 'bg-brand/5' : ''
                                }`}
                              >
                                {(() => {
                                  const iconData =
                                    getNotificationIcon(notification);
                                  if (iconData.type === 'image') {
                                    return (
                                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                                        <img
                                          src={iconData.src}
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    );
                                  }
                                  const IconComponent = iconData.icon;
                                  return (
                                    <div
                                      className={`flex-shrink-0 w-12 h-12 rounded-lg ${iconData.bgColor} flex items-center justify-center`}
                                    >
                                      <IconComponent
                                        className={`w-6 h-6 ${iconData.iconColor}`}
                                      />
                                    </div>
                                  );
                                })()}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900">
                                    <span className="font-semibold">
                                      {notification.title}
                                    </span>{' '}
                                    {notification.body}
                                  </p>
                                  <p
                                    className={`text-xs mt-1.5 ${!notification.is_read ? 'text-brand font-medium' : 'text-gray-500'}`}
                                  >
                                    {formatTimestamp(notification.created_at)}
                                  </p>
                                </div>
                                {!notification.is_read && (
                                  <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-brand mt-1.5" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )
                ) : (
                  // Settings Tab
                  <div className="p-6">
                    <div className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {t('text-push-notifications', {
                            defaultValue: 'Notifiche Push',
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t('text-receive-updates', {
                            defaultValue:
                              'Ricevi aggiornamenti su ordini e prodotti',
                          })}
                        </p>
                      </div>
                      {/* Toggle Switch */}
                      <button
                        onClick={handleToggleSubscription}
                        disabled={isPushLoading}
                        role="switch"
                        aria-checked={isSubscribed}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                          isPushLoading ? 'opacity-50 cursor-wait' : ''
                        } ${isSubscribed ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isSubscribed ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Placeholder for future preferences */}
                    {isSubscribed && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">
                          {t('text-more-settings-coming', {
                            defaultValue: 'Altre impostazioni in arrivo',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onNavigate={handleModalNavigate}
        onDelete={handleDeleteNotification}
        lang={lang}
      />
    </div>
  );
}
