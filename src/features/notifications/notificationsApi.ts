import { api } from '@/api/client';
import type { ApiResponse } from '@/types/api';

/** Inbox tabs; the server sorts each notification into one of these. */
export type NotificationCategory = 'warn' | 'urgent' | 'info';

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
    /** ISO time, on follow-up alerts. */
    dueAt?: string;
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
export const UNREAD_BY_CATEGORY_KEY = [
  'notifications',
  'unread-by-category',
] as const;

export async function fetchNotifications(
  category: NotificationCategory,
  page = 1,
  limit = 30
) {
  const { data } = await api.get<
    ApiResponse<{
      data: AppNotification[];
      meta: { page: number; last_page: number; unread: number };
    }>
  >('/notifications', { params: { category, page, limit } });
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

export async function fetchUnreadByCategory() {
  const { data } = await api.get<
    ApiResponse<{ byCategory: Record<NotificationCategory, number> }>
  >('/notifications/unread-count');
  return data.data?.byCategory ?? { warn: 0, urgent: 0, info: 0 };
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead() {
  await api.patch('/notifications/read-all');
}
