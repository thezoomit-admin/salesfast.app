import { HomeLatestLeads } from '@/components/home/HomeLatestLeads';
import { HomePerformance } from '@/components/home/HomePerformance';
import { HomePipelineStages } from '@/components/home/HomePipelineStages';
import { HomeQuickFeatures } from '@/components/home/HomeQuickFeatures';
import { HomeUpcomingFollowUps } from '@/components/home/HomeUpcomingFollowUps';
import type { FollowUpStats, MobileDashboard } from '@/types/api';

type Props = {
  kpis: MobileDashboard['kpis'];
  trends?: MobileDashboard['trends'];
  /** Missing on old servers — the on-time rate is then hidden. */
  followUpStats?: FollowUpStats;
  recentLeads: MobileDashboard['recentLeads'];
  queue: MobileDashboard['upcomingFollowUps'];
};

/** The sections that need dashboard data, spaced by the Home scroll view. */
export function HomeDashboard({
  kpis,
  trends,
  followUpStats,
  recentLeads,
  queue,
}: Props) {
  return (
    <>
      <HomeQuickFeatures kpis={kpis} trends={trends} />
      <HomePerformance kpis={kpis} followUpStats={followUpStats} />
      <HomeUpcomingFollowUps queue={queue} />
      <HomePipelineStages />
      <HomeLatestLeads leads={recentLeads} />
    </>
  );
}
