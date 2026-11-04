import { infiniteQueryOptions } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { ApiResponse, MobileDashboard } from '@/types/api';

import { activityDateRange, type ActivityFilters } from './activityFilters';

export type Activity = MobileDashboard['recentNotes'][number];

export type ActivitiesPage = {
  items: Activity[];
  nextCursor: string | null;
};

/** Search and filters run on the server: the feed can hold thousands of notes. */
export const activitiesQuery = (search: string, filters: ActivityFilters) =>
  infiniteQueryOptions({
    queryKey: ['mobile-activities', search, filters.types, filters.dates],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ApiResponse<ActivitiesPage>>(
        '/crm/mobile/dashboard/activities',
        {
          params: {
            search: search || undefined,
            types: filters.types.join(',') || undefined,
            ...activityDateRange(filters.dates),
            cursor: pageParam ?? undefined,
          },
        }
      );
      return data.data;
    },
    getNextPageParam: (last) => last.nextCursor,
  });
