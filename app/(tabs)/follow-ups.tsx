import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { startOfWeek } from 'date-fns/startOfWeek';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';

import { getErrorMessage } from '@/api/client';
import { groupByDay } from '@/components/followups/followUpCalendar';
import { FollowUpMonthView } from '@/components/followups/FollowUpMonthView';
import { FollowUpWeekView } from '@/components/followups/FollowUpWeekView';
import {
  followUpMonthKey,
  followUpMonthQuery,
} from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import type { LeadListItem } from '@/types/api';

type MonthData = { items: LeadListItem[] };

/** Module-level so useQueries memoizes the merged result between renders. */
function combineMonths(results: UseQueryResult<MonthData>[]) {
  return {
    items: results.flatMap((r) => r.data?.items ?? []),
    loading: results.some((r) => r.isPending),
    refreshing: results.some((r) => r.isRefetching),
    error: results.find((r) => r.error)?.error ?? null,
    refetch: () => Promise.all(results.map((r) => r.refetch())),
  };
}

function FollowUpsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Date());
  const [mode, setMode] = useState<'month' | 'week'>('month');

  // Month mode needs the visible month; a week can straddle two.
  const months = useMemo(() => {
    if (mode === 'month') return [followUpMonthKey(selected)];
    const start = startOfWeek(selected);
    return [...new Set([followUpMonthKey(start), followUpMonthKey(addDays(start, 6))])];
  }, [mode, selected]);

  const data = useQueries({
    queries: months.map(followUpMonthQuery),
    combine: combineMonths,
  });

  const byDay = useMemo(() => groupByDay(data.items), [data.items]);
  const { openLead, prefetchLead } = useLeadRowHandlers(data.items);

  const shiftMonth = useCallback(
    (delta: number) => setSelected((d) => addMonths(d, delta)),
    []
  );
  // A follow-up is scheduled from a lead, so "+" starts at the lead list.
  const addFollowUp = useCallback(() => router.navigate('/(tabs)/leads'), [router]);
  const refresh = useCallback(() => void data.refetch(), [data]);
  const errorMessage = data.error ? getErrorMessage(data.error) : null;

  if (mode === 'week') {
    return (
      <FollowUpWeekView
        selected={selected}
        byDay={byDay}
        loading={data.loading}
        errorMessage={errorMessage}
        refreshing={data.refreshing}
        onRefresh={refresh}
        onSelect={setSelected}
        onBack={() => setMode('month')}
        onAdd={addFollowUp}
        onOpenLead={openLead}
        onPressInLead={prefetchLead}
      />
    );
  }

  return (
    <FollowUpMonthView
      selected={selected}
      byDay={byDay}
      loading={data.loading}
      errorMessage={errorMessage}
      refreshing={data.refreshing}
      onRefresh={refresh}
      onSelect={setSelected}
      onShiftMonth={shiftMonth}
      onOpenWeek={() => setMode('week')}
      onAdd={addFollowUp}
      onOpenLead={openLead}
      onPressInLead={prefetchLead}
    />
  );
}

export default memo(FollowUpsScreen);
