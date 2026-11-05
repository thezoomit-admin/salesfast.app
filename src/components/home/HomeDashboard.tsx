import { HomeLatestLeads } from '@/components/home/HomeLatestLeads';
import { HomePerformance } from '@/components/home/HomePerformance';
import { HomePipelineStages } from '@/components/home/HomePipelineStages';
import { HomeQuickFeatures } from '@/components/home/HomeQuickFeatures';
import { HomeUpcomingFollowUps } from '@/components/home/HomeUpcomingFollowUps';
import type { MobileDashboard } from '@/types/api';

type Props = {
  kpis: MobileDashboard['kpis'];
  trends?: MobileDashboard['trends'];
  completedByDay?: MobileDashboard['completedByDay'];
  recentLeads: MobileDashboard['recentLeads'];
  queue: MobileDashboard['upcomingFollowUps'];
};

/** The sections that need dashboard data, spaced by the Home scroll view. */
export function HomeDashboard({
  kpis,
  trends,
  completedByDay,
  recentLeads,
  queue,
}: Props) {
  return (
    <>
      <HomeQuickFeatures kpis={kpis} trends={trends} />
      <HomePerformance
        kpis={kpis}
        trends={trends}
        completedByDay={completedByDay}
      />
      <HomeUpcomingFollowUps queue={queue} />
      <HomePipelineStages />
      <HomeLatestLeads leads={recentLeads} />
    </>
  );
}
