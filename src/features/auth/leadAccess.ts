/**
 * Client-side lead list ACL — mirrors backend resolveLeadAccess for menu
 * visibility (My Leads vs All Leads). Server still enforces on every request.
 */
import type { AuthUser } from '@/types/api';

const ALL_LEADS_PATH = '/crm/leads';
/** Same key as backend ADMINISTRATION_DESIGNATION_KEY. */
const ADMINISTRATION_DESIGNATION_KEY = 'administration';

type SidebarRow = {
  path?: string;
  actions?: unknown;
};

function sidebarRows(permissions: unknown): SidebarRow[] {
  if (permissions == null || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return [];
  }
  const sidebar = (permissions as { sidebar?: unknown }).sidebar;
  return Array.isArray(sidebar) ? (sidebar as SidebarRow[]) : [];
}

function grantsView(sidebar: SidebarRow[], path: string): boolean {
  return sidebar.some(
    (s) =>
      s?.path === path &&
      Array.isArray(s.actions) &&
      s.actions.some((a) => String(a).trim().toLowerCase() === 'view')
  );
}

/**
 * True when this account may open All Leads (every lead in tenant scope).
 * Restricted agents with only `/crm/leads/mine` get false.
 */
export function canViewAllLeads(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (String(user.role ?? '').toUpperCase() === 'SUPER_ADMIN') return true;
  if (user.designation?.key === ADMINISTRATION_DESIGNATION_KEY) return true;

  const sidebar = sidebarRows(user.designation?.permissions);
  // Legacy / empty sidebar ACL: same as backend — full lead visibility.
  if (sidebar.length === 0) return true;
  return grantsView(sidebar, ALL_LEADS_PATH);
}

export type LeadListMode = 'mine' | 'all';
