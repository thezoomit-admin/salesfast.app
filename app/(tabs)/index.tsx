import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { KpiCard } from '@/components/ui/KpiCard';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { APP_NAME } from '@/constants/config';
import { useAuth } from '@/features/auth/AuthContext';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { fetchMobileDashboard } from '@/features/dashboard/dashboardApi';
import { colors, radii, spacing, typography } from '@/theme';
import { formatDate, formatRelative } from '@/utils/dates';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const callSync = useCallSyncStatus();
  const query = useQuery({
    queryKey: ['mobile-dashboard'],
    queryFn: fetchMobileDashboard,
  });

  useFocusEffect(
    useCallback(() => {
      void callSync.refresh();
    }, [callSync.refresh])
  );

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading dashboard…" />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      </Screen>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <Screen>
        <EmptyState title="No dashboard data" />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{APP_NAME}</Text>
        <Text style={styles.title}>Hello, {user?.name?.split(' ')[0] || 'Agent'}</Text>
        <Text style={styles.subtitle}>Your assigned pipeline at a glance.</Text>
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard label="Assigned leads" value={data.kpis.totalAssigned} tone="accent" />
        <KpiCard label="New (7 days)" value={data.kpis.newLeads} />
        <KpiCard label="Pending follow-ups" value={data.kpis.pendingFollowUps} />
        <KpiCard
          label="Overdue"
          value={data.kpis.overdueFollowUps}
          tone={data.kpis.overdueFollowUps > 0 ? 'warning' : 'default'}
        />
        <KpiCard label="Today's follow-ups" value={data.kpis.todayFollowUps} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Call synchronization</Text>
        <Text style={styles.panelBody}>{callSync.message}</Text>
        <View
          style={[
            styles.syncBadge,
            callSync.status === 'configured' || callSync.status === 'unavailable_web'
              ? styles.syncBadgeOk
              : null,
          ]}
        >
          <Text
            style={[
              styles.syncBadgeText,
              callSync.status === 'configured' || callSync.status === 'unavailable_web'
                ? styles.syncBadgeTextOk
                : null,
            ]}
          >
            Status: {callSync.label}
          </Text>
        </View>
        <Button
          title={
            callSync.status === 'not_configured'
              ? 'Configure call sync'
              : 'Manage call sync'
          }
          variant="secondary"
          onPress={() => router.push('/call-sync/setup')}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Upcoming follow-ups</Text>
        {data.upcomingFollowUps.length === 0 ? (
          <Text style={styles.panelBody}>No pending follow-ups.</Text>
        ) : (
          data.upcomingFollowUps.slice(0, 5).map((item) => (
            <Pressable
              key={item.id}
              style={styles.row}
              onPress={() => router.push(`/leads/${item.leadId}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.leadName}</Text>
                <Text style={styles.rowMeta}>{formatDate(item.dueAt)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Recent lead updates</Text>
        {data.recentLeads.length === 0 ? (
          <Text style={styles.panelBody}>No recent leads.</Text>
        ) : (
          data.recentLeads.slice(0, 5).map((lead) => (
            <Pressable
              key={lead.id}
              style={styles.row}
              onPress={() => router.push(`/leads/${lead.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{lead.name}</Text>
                <Text style={styles.rowMeta}>
                  {lead.status?.name || 'No status'} · {formatRelative(lead.updatedAt)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  eyebrow: { ...typography.label, color: colors.brandMuted },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  panelTitle: { ...typography.subtitle, color: colors.text },
  panelBody: { ...typography.body, color: colors.textSecondary },
  syncBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  syncBadgeOk: {
    backgroundColor: colors.successSoft,
  },
  syncBadgeText: { ...typography.caption, color: colors.warning },
  syncBadgeTextOk: { color: colors.success },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  rowTitle: { ...typography.subtitle, color: colors.text, fontSize: 15 },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.textMuted },
});
