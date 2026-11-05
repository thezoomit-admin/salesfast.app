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
  /** Stable automation key (DRAFT, ASSIGN, …). */
  code?: string | null;
  color?: string | null;
  sortOrder?: number | null;
  isWonStage?: boolean;
  isLostStage?: boolean;
  hasRating?: boolean;
  stageOptions?: string[] | null;
};

export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type BuyerPersonaProfile = {
  nid?: string | null;
  occupation?: string | null;
  propertyType?: string | null;
  locationPref?: string | null;
  sizePref?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  financingMethod?: string | null;
  timeline?: string | null;
};

export type LeadListItem = {
  id: number;
  buyerPersona?: {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    profile?: BuyerPersonaProfile | null;
  } | null;
  leadStatus?: LeadStatus | null;
  leadSource?: { id: number; name: string } | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  /** Lead priority (Low / Medium / High). */
  priority?: LeadPriority | null;
  nextFollowupDate?: string | null;
  lastContactDate?: string | null;
  updatedAt?: string;
  createdAt?: string;
  followUpCount?: number;
  /** false → nobody has opened the lead yet (Unread). Missing on old servers. */
  viewed?: boolean;
};

export type LeadNote = {
  id: number;
  note: string;
  createdAt: string;
  addedByName?: string | null;
  channel?: { id: number; name: string } | null;
  followupDate?: string | null;
};

export type LeadPropertyInterest = {
  inventoryId: number;
  position?: number;
  inventory?: {
    id?: number;
    name?: string | null;
    projectName?: string | null;
    price?: number | null;
    status?: string | null;
    isDeleted?: boolean;
  } | null;
};

/** Lead Entry / qualification fields shown on web Overview → Requirements. */
export type LeadDetail = LeadListItem & {
  preferredLocations?: string[];
  propertyTypes?: string[];
  purchasePurpose?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  sourceDetail?: string | null;
  leadProject?: string | null;
  referralSource?: string | null;
  occupationCategory?: string | null;
  occupationDetail?: string | null;
  buyerType?: string | null;
  decisionAuthority?: string | null;
  unitSizeMin?: number | null;
  unitSizeMax?: number | null;
  bedrooms?: string | null;
  mustHaveRequirements?: string | null;
  alsoConsidering?: string | null;
  financingRequired?: string | null;
  preferredPaymentMethod?: string | null;
  downPaymentAvailable?: number | null;
  monthlyHouseholdIncome?: string | null;
  budgetFlexibility?: string | null;
  purchaseTimeline?: string | null;
  targetPurchaseDate?: string | null;
  urgency?: string | null;
  timelineReason?: string | null;
  currentLivingSituation?: string | null;
  currentLocation?: string | null;
  familySize?: number | null;
  currentMonthlyRent?: number | null;
  ownsExistingProperty?: string | null;
  existingPropertyNotes?: string | null;
  problemCategory?: string[];
  problemDescription?: string | null;
  problemSeverity?: string | null;
  impactOfCurrentProblem?: string | null;
  financialImpact?: string | null;
  familyBusinessImpact?: string | null;
  riskOfNotSolving?: string | null;
  urgencyToSolve?: string | null;
  desiredOutcome?: string | null;
  preferredPropertySolution?: string | null;
  expectedBenefit?: string | null;
  propertyInterests?: LeadPropertyInterest[];
  notes?: LeadNote[];
  meetings?: unknown[];
  tasks?: unknown[];
  statusHistory?: LeadStatusHistoryEntry[];
  pendingFollowUp?: {
    id: number;
    dueAt: string;
    type?: string | null;
    reminderMinutes?: number | null;
    remindAt?: string | null;
  } | null;
  version?: number;
};

export type LeadStatusHistoryEntry = {
  id: number;
  fromStatusName?: string | null;
  toStatusName?: string | null;
  stageRating?: string | null;
  stageOption?: string | null;
  changedByName?: string | null;
  changedAt: string;
  note?: string | null;
};

export type LeadViewEntry = {
  id: number;
  userId: string;
  userName?: string | null;
  viewedAt: string;
  lastSeenAt?: string;
  durationSeconds: number;
  endedAt?: string | null;
  isLive?: boolean;
};

export type LeadViewHistory = {
  items: LeadViewEntry[];
  total: number;
  liveCount: number;
  firstViewId: number | null;
  hasMore: boolean;
};

export type LeadOptionRow = { id?: number; key: string; label: string };

export type LeadMeta = {
  options: Record<string, LeadOptionRow[]>;
  removed: Record<string, LeadOptionRow[]>;
  fixed: Record<string, LeadOptionRow[]>;
  limits?: Record<string, number>;
};

export type MobileDashboard = {
  kpis: {
    totalAssigned: number;
    newLeads: number;
    pendingFollowUps: number;
    todayFollowUps: number;
    overdueFollowUps: number;
    completedActivities: number;
    /** Missing on old servers. */
    callsToday?: number;
  };
  /** Percent change; null without a baseline. Missing on old servers. */
  trends?: {
    leads: number | null;
    followUps: number | null;
    calls: number | null;
  };
  recentLeads: Array<{
    id: number;
    name: string;
    phone: string | null;
    status: LeadStatus | null;
    source: { id: number; name: string } | null;
    assignedToName: string | null;
    priority: LeadPriority | null;
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
  /** Missing on old servers. */
  followUpStats?: FollowUpStats;
};

/** Last 30 days: on time = done within 24h of due (same rule as the admin report). */
export type FollowUpStats = {
  windowDays: number;
  due: number;
  onTime: number;
  late: number;
  missed: number;
  onTimePercent: number | null;
};

export type FollowUpOutcome =
  | 'REACHED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'CALL_BACK_LATER'
  | 'NOT_INTERESTED';

/** One of my follow-ups (`/crm/mobile/dashboard/follow-ups`). Cancelled ones are not listed. */
export type MyFollowUp = {
  id: number;
  dueAt: string;
  type: string | null;
  status: 'PENDING' | 'DONE' | 'MISSED';
  doneAt: string | null;
  doneByName: string | null;
  /** Done rows only: completed within 24h of due. */
  onTime: boolean | null;
  outcome: FollowUpOutcome | null;
  channel: string | null;
  /** The note written when it was scheduled. */
  agenda: string | null;
  /** Done rows only: the note logged when it was completed. */
  outcomeNote: string | null;
  lead: {
    id: number;
    name: string;
    phone: string | null;
    priority: LeadPriority | null;
    status: { id: number; name: string } | null;
    updatedAt?: string;
  };
};
