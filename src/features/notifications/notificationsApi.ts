import { api } from '@/api/client';
import type { ApiResponse } from '@/types/api';

/** Inbox tabs; the server sorts each notification into one of these. */
export type NotificationCategory = 'warn' | 'urgent' | 'info';

/** active = still needs attention; history = resolved. */
export type NotificationState = 'active' | 'history';

/** Row shape returned by GET /notifications (NotificationService.toClient). */
export type AppNotification = {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  /** Route inside this app — `/leads/<id>` or `/notifications`. */
  mobileUrl?: string;
  /** Set once the follow-up behind an alert no longer needs it. */
  resolvedAt?: string | null;
  resolution?: string | null;
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
  nextCursor: string | null;
};

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const UNREAD_COUNT_KEY = ['notifications', 'unread-count'] as const;
export const UNREAD_BY_CATEGORY_KEY = [
  'notifications',
  'unread-by-category',
] as const;

export async function fetchNotifications(
  category: NotificationCategory,
  state: NotificationState,
  cursor: string | null,
  limit = 30
) {
  const { data } = await api.get<
    ApiResponse<{
      data: AppNotification[];
      meta: { nextCursor?: string | null };
    }>
  >('/notifications', {
    params: { category, state, limit, ...(cursor ? { cursor } : {}) },
  });
  const payload = data.data;
  return {
    items: payload?.data ?? [],
    nextCursor: payload?.meta?.nextCursor ?? null,
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

export async function dismissNotification(id: string) {
  await api.patch(`/notifications/${encodeURIComponent(id)}/dismiss`);
}

export async function markAllNotificationsRead() {
  await api.patch('/notifications/read-all');
}
