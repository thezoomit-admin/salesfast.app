import { api } from '@/api/client';
import type { ApiResponse } from '@/types/api';

/** Inbox tabs; the server sorts each notification into one of these. */
export type NotificationCategory = 'warn' | 'urgent' | 'info';

/** A category, or every notification at once. */
export type NotificationTab = 'all' | NotificationCategory;

/** active = still needs attention; history = resolved. */
export type NotificationState = 'active' | 'history';

/** Narrows a tab's list; the server does the matching. */
export type NotificationFilters = {
  keyword?: string;
  unreadOnly?: boolean;
};

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
    /** SITE_VISIT, OFFICE_VISIT, COLD_CALL or FOLLOWUP, on follow-up alerts. */
    followUpType?: string | null;
    [key: string]: unknown;
  };
};

export type NotificationPage = {
  items: AppNotification[];
  nextCursor: string | null;
};

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const UNREAD_COUNT_KEY = ['notifications', 'unread-count'] as const;
export const UNREAD_BY_TAB_KEY = ['notifications', 'unread-by-tab'] as const;

export async function fetchNotifications(
  tab: NotificationTab,
  state: NotificationState,
  cursor: string | null,
  { keyword, unreadOnly }: NotificationFilters = {},
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
      ...(keyword ? { keyword } : {}),
      ...(unreadOnly ? { unreadOnly: 'true' } : {}),
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

export async function fetchUnreadByTab() {
  const { data } = await api.get<
    ApiResponse<{ byCategory: Record<NotificationCategory, number> }>
  >('/notifications/unread-count');
  const unread = data.data?.byCategory ?? { warn: 0, urgent: 0, info: 0 };
  return { ...unread, all: unread.warn + unread.urgent + unread.info };
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
