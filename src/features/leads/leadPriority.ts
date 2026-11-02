import type { LeadPriority } from '@/types/api';

export const PRIORITY_META: Record<
  LeadPriority,
  { label: string; color: string; bg: string; border: string }
> = {
  LOW: { label: 'Low', color: '#0ba5ec', bg: '#EFF8FF', border: '#B2E0FE' },
  MEDIUM: {
    label: 'Medium',
    color: '#d97706',
    bg: '#FFFAEB',
    border: '#FEE399',
  },
  HIGH: { label: 'High', color: '#f04438', bg: '#FFF1F0', border: '#FECDC9' },
};

export const PRIORITIES: LeadPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
