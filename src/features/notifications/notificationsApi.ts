import { api } from '@/api/client';
import type { ApiResponse } from '@/types/api';

/** Row shape returned by GET /notifications (NotificationService.toClient). */
export type AppNotification = {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  /** Route inside this app — `/leads/<id>` or `/notifications`. */
  mobileUrl?: string;
  metadata?: {
    crmType?: string;
    leadId?: number;
    [key: string]: unknown;
  };
};

export type NotificationPage = {
  items: AppNotification[];
  page: number;
  lastPage: number;
  unread: number;
};

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const UNREAD_COUNT_KEY = ['notifications', 'unread-count'] as const;

export async function fetchNotifications(page = 1, limit = 30) {
  const { data } = await api.get<
    ApiResponse<{
      data: AppNotification[];
      meta: { page: number; last_page: number; unread: number };
    }>
  >('/notifications', { params: { page, limit } });
  const payload = data.data;
  return {
    items: payload?.data ?? [],
    page: payload?.meta?.page ?? page,
    lastPage: payload?.meta?.last_page ?? page,
    unread: payload?.meta?.unread ?? 0,
  } satisfies NotificationPage;
}

export async function fetchUnreadCount() {
  const { data } = await api.get<ApiResponse<{ total: number }>>(
    '/notifications/unread-count'
  );
  return data.data?.total ?? 0;
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead() {
  await api.patch('/notifications/read-all');
}
