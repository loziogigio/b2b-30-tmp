'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { HiOutlineBell, HiOutlineCheck } from 'react-icons/hi2';
import { useClickOutside } from '@hooks/use-click-outside';

export interface Notification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  action_url?: string;
  timestamp: string | Date;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const panelRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(panelRef, () => setIsOpen(false));

  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const handleNotificationClick = (notification: Notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
    setIsOpen(false);
  };

  const formatTimestamp = (timestamp: string | Date) => {
    try {
      const date =
        typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      return formatDistanceToNow(date, { addSuffix: false, locale: it });
    } catch {
      return '';
    }
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifiche"
      >
        <HiOutlineBell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Notifiche</h2>
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <HiOutlineCheck className="w-4 h-4" />
                Segna tutte lette
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 px-4 py-2 border-b border-gray-100">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tutte
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Non lette
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <HiOutlineBell className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">
                  {filter === 'unread'
                    ? 'Nessuna notifica non letta'
                    : 'Nessuna notifica'}
                </p>
              </div>
            ) : (
              <div>
                {filteredNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    {/* Icon/Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {notification.icon ? (
                        <img
                          src={notification.icon}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <HiOutlineBell className="w-6 h-6 text-gray-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">
                          {notification.title}
                        </span>{' '}
                        {notification.body}
                      </p>
                      <p
                        className={`text-xs mt-1 ${!notification.read ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
                      >
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="flex-shrink-0 w-3 h-3 rounded-full bg-blue-500 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
