import { ArrowLeft, Bell, Calendar, Users, Shield, Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FirestoreNotification } from '../types/auth';
import { getNotifications, markNotificationAsRead } from '../lib/firestoreService';

interface NotificationsProps {
  onBack: () => void;
  onNavigateToNotification: (notification: FirestoreNotification) => void;
}

export default function Notifications({ onBack, onNavigateToNotification }: NotificationsProps) {
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'system' | 'event' | 'announcement'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const filteredNotifications = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'system': return Shield;
      case 'club': return Users;
      case 'event': return Calendar;
      case 'announcement': return Megaphone;
      default: return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'system': return 'text-amber-600 dark:text-amber-400';
      case 'club': return 'text-green-600 dark:text-green-400';
      case 'event': return 'text-blue-600 dark:text-blue-400';
      case 'announcement': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getSourceLabel = (notification: FirestoreNotification) => {
    if (notification.clubId) {
      return `From Club`;
    }
    return 'From Admin';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length },
            { id: 'announcement', label: 'Announcements', count: notifications.filter(n => n.type === 'announcement').length },
            { id: 'event', label: 'Events', count: notifications.filter(n => n.type === 'event').length }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${activeFilter === filter.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
            >
              <span>{filter.label}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${activeFilter === filter.id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">No notifications</h3>
              <p className="text-slate-500 dark:text-slate-500">You're all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read) handleMarkAsRead(notification.id!);
                    onNavigateToNotification(notification);
                  }}
                  className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500' : ''
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${notification.read ? 'bg-slate-100 dark:bg-slate-700' : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                      <Icon className={`w-6 h-6 ${getIconColor(notification.type)}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {notification.title}
                            </h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${notification.clubId
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              }`}>
                              {getSourceLabel(notification)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            {formatDate(notification.createdAt instanceof Date ? notification.createdAt : new Date(notification.createdAt))}
                          </span>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
