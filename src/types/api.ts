export type ApiResponse<T> = {
  success: boolean;
  status: number;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    current_page?: number;
    per_page?: number;
    last_page?: number;
  };
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active?: boolean;
  last_login?: string | null;
  profilePhoto?: string | null;
  designationId?: string | null;
  designation?: {
    id: string;
    name: string;
    permissions?: unknown;
  } | null;
};

export type AuthSessionSummary = {
  id: string;
  expiresAt: string;
  absoluteExpiresAt: string;
};

export type MobileLoginResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  session: AuthSessionSummary;
  device: {
    label: string;
    syncEnabled: boolean;
    syncStatus: string;
  };
};

export type MobileRefreshResult = {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUser;
  session: AuthSessionSummary;
};

export type LeadStatus = {
  id: number;
  name: string;
  color?: string | null;
};

export type LeadListItem = {
  id: number;
  buyerPersona?: {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
  } | null;
  leadStatus?: LeadStatus | null;
  leadSource?: { id: number; name: string } | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  nextFollowupDate?: string | null;
  lastContactDate?: string | null;
  updatedAt?: string;
  createdAt?: string;
  followUpCount?: number;
};

export type LeadNote = {
  id: number;
  note: string;
  createdAt: string;
  addedByName?: string | null;
  channel?: { id: number; name: string } | null;
  followupDate?: string | null;
};

export type LeadDetail = LeadListItem & {
  preferredLocations?: string[];
  propertyTypes?: string[];
  purchasePurpose?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  notes?: LeadNote[];
  meetings?: unknown[];
  tasks?: unknown[];
  statusHistory?: unknown[];
  pendingFollowUp?: {
    id: number;
    dueAt: string;
    type?: string | null;
    reminderMinutes?: number | null;
    remindAt?: string | null;
  } | null;
  version?: number;
};

export type MobileDashboard = {
  kpis: {
    totalAssigned: number;
    newLeads: number;
    pendingFollowUps: number;
    todayFollowUps: number;
    overdueFollowUps: number;
    completedActivities: number;
  };
  recentLeads: Array<{
    id: number;
    name: string;
    phone: string | null;
    status: LeadStatus | null;
    source: { id: number; name: string } | null;
    assignedToName: string | null;
    nextFollowupDate: string | null;
    updatedAt: string;
  }>;
  recentNotes: Array<{
    id: number;
    note: string;
    createdAt: string;
    addedByName: string | null;
    channel: { id: number; name: string } | null;
    leadId: number;
    leadName: string;
    leadPhone: string | null;
  }>;
  upcomingFollowUps: Array<{
    id: number;
    dueAt: string;
    type: string | null;
    status: string;
    note: string | null;
    leadId: number;
    leadName: string;
    leadPhone: string | null;
  }>;
  callSync: {
    status: string;
    message: string;
  };
};
