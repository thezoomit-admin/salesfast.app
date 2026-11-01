import { api } from '@/api/client';
import type { ApiResponse, MobileDashboard } from '@/types/api';

export async function fetchMobileDashboard() {
  const { data } = await api.get<ApiResponse<MobileDashboard>>(
    '/crm/mobile/dashboard'
  );
  return data.data;
}
