import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { addDays } from 'date-fns/addDays';
import { startOfWeek } from 'date-fns/startOfWeek';
import { memo, useCallback, useMemo, useState } from 'react';

import { getErrorMessage } from '@/api/client';
import { groupByDay } from '@/components/followups/followUpCalendar';
import { FollowUpCalendarModal } from '@/components/followups/FollowUpCalendarModal';
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
  const [selected, setSelected] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  // A week can straddle two months.
  const months = useMemo(() => {
    const start = startOfWeek(selected);
    return [...new Set([followUpMonthKey(start), followUpMonthKey(addDays(start, 6))])];
  }, [selected]);

  const data = useQueries({
    queries: months.map(followUpMonthQuery),
    combine: combineMonths,
  });

  const byDay = useMemo(() => groupByDay(data.items), [data.items]);
  const { openLead, prefetchLead } = useLeadRowHandlers(data.items);

  const shiftWeek = useCallback(
    (delta: number) => setSelected((d) => addDays(d, delta * 7)),
    []
  );
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const refresh = useCallback(() => void data.refetch(), [data]);

  return (
    <>
      <FollowUpWeekView
        selected={selected}
        byDay={byDay}
        loading={data.loading}
        errorMessage={data.error ? getErrorMessage(data.error) : null}
        refreshing={data.refreshing}
        onRefresh={refresh}
        onSelect={setSelected}
        onShiftWeek={shiftWeek}
        onPickDate={openPicker}
        onOpenLead={openLead}
        onPressInLead={prefetchLead}
      />
      <FollowUpCalendarModal
        open={pickerOpen}
        selected={selected}
        onSelect={setSelected}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

export default memo(FollowUpsScreen);
