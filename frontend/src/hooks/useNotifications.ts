import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

export interface InAppNotification {
  id: string;
  eventType: string;
  subject: string;
  contentBody: string;
  status: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
  metadata?: Record<string, any>;
}

const FALLBACK_IN_APP_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif-mock-1',
    eventType: 'INTERVIEW_SCHEDULED',
    subject: 'Technical Round 1 Scheduled',
    contentBody: 'Your Technical System Design round is scheduled for Nov 14 at 14:00 UTC.',
    status: 'SENT',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    metadata: { route: '/candidate/interviews' },
  },
  {
    id: 'notif-mock-2',
    eventType: 'APPLICATION_RECEIVED',
    subject: 'Application Under Review',
    contentBody: 'Our talent team is actively reviewing your resume and engineering portfolio.',
    status: 'SENT',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    metadata: { route: '/candidate/applications' },
  },
];

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.get('/notifications');
      if (res.data?.success && Array.isArray(res.data.notifications)) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Fallback for offline / emulator demo mode
      setNotifications(FALLBACK_IN_APP_NOTIFICATIONS);
      setUnreadCount(FALLBACK_IN_APP_NOTIFICATIONS.filter((n) => !n.isRead).length);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await apiClient.patch(`/notifications/${id}/read`);
      } catch (err) {
        console.warn('[useNotifications] Failed to sync read status:', err);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await apiClient.post('/notifications/read-all');
    } catch (err) {
      console.warn('[useNotifications] Failed to sync mark-all-read:', err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;
