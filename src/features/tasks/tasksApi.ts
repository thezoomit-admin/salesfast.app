import { queryOptions } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { ApiResponse } from '@/types/api';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export type LeadTask = {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus | string;
  dueDate?: string | null;
  assignedToName?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  leadId: number;
  lead?: {
    id: number;
    contact?: { name?: string | null } | null;
    organization?: { name?: string | null } | null;
    leadStatus?: { name?: string | null; color?: string | null } | null;
  } | null;
};

export type TasksPage = {
  items: LeadTask[];
  meta: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
};

type ListParams = {
  page?: number;
  per_page?: number;
  status?: TaskStatus;
  search?: string;
  mine?: boolean;
};

export async function fetchTasks(params: ListParams = {}): Promise<TasksPage> {
  const { data } = await api.get<
    ApiResponse<LeadTask[] | { data: LeadTask[]; meta?: TasksPage['meta'] }>
  >('/crm/tasks', {
    params: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      status: params.status,
      search: params.search || undefined,
      ...(params.mine ? { mine: true } : {}),
    },
  });
  const payload = data.data;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  const meta =
    data.meta ??
    (!Array.isArray(payload) && payload?.meta ? payload.meta : {}) ??
    {};
  return { items, meta };
}

export async function updateTaskStatus(id: number, status: TaskStatus) {
  const { data } = await api.put<ApiResponse<LeadTask>>(`/crm/tasks/${id}`, {
    status,
  });
  return data.data;
}

export const MY_TASKS_KEY = ['my-tasks'] as const;

/** All of my tasks — client filters into Today / Open / Done. */
export const myTasksQuery = queryOptions({
  queryKey: MY_TASKS_KEY,
  queryFn: () => fetchTasks({ mine: true, per_page: 100 }),
});

export function leadTitleOf(task: LeadTask) {
  const contact = task.lead?.contact?.name?.trim();
  if (contact) return contact;
  const org = task.lead?.organization?.name?.trim();
  if (org) return org;
  return `Lead #${task.leadId}`;
}

export function isOpenStatus(status?: string | null) {
  return status === 'OPEN' || status === 'IN_PROGRESS';
}

export function isTaskOverdue(dueDate?: string | null, status?: string | null) {
  if (!dueDate || !isOpenStatus(status)) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return due.getTime() < start.getTime();
}

export function isDueToday(dueDate?: string | null) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

/** Today's work: overdue + due today, still open. */
export function isTodayWork(task: LeadTask) {
  if (!isOpenStatus(task.status)) return false;
  return isTaskOverdue(task.dueDate, task.status) || isDueToday(task.dueDate);
}
