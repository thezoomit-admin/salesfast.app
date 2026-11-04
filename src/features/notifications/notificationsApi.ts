import { api } from '@/api/client';
import type { ApiResponse } from '@/types/api';

/** Inbox tabs; the server sorts each notification into one of these. */
export type NotificationCategory = 'warn' | 'urgent' | 'info';

/** A category, or every notification at once. */
export type NotificationTab = 'all' | NotificationCategory;

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
export const CATEGORY_COUNTS_KEY = ['notifications', 'category-counts'] as const;

export async function fetchNotifications(
  tab: NotificationTab,
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
    params: {
      state,
      limit,
      ...(tab === 'all' ? {} : { category: tab }),
      ...(cursor ? { cursor } : {}),
    },
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

/** Per tab: everything it lists (`total`) and how much of that is `unread`. */
export async function fetchCategoryCounts() {
  const { data } = await api.get<
    ApiResponse<{
      byCategory: Record<NotificationCategory, number>;
      totalByCategory: Record<NotificationCategory, number>;
    }>
  >('/notifications/unread-count');
  const none = { warn: 0, urgent: 0, info: 0 };
  const total = data.data?.totalByCategory ?? none;
  return {
    unread: data.data?.byCategory ?? none,
    total: { ...total, all: total.warn + total.urgent + total.info },
  };
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
