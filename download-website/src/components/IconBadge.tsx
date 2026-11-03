import {
  Bell,
  ChartColumn,
  Phone,
  RefreshCw,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AppReleaseConfig } from '../config/app';

const MAP: Record<AppReleaseConfig['features'][number]['icon'], LucideIcon> = {
  shield: Shield,
  users: Users,
  phone: Phone,
  sync: RefreshCw,
  bell: Bell,
  chart: ChartColumn,
};

type Props = {
  name: AppReleaseConfig['features'][number]['icon'];
  className?: string;
};

export function FeatureIcon({ name, className = 'h-5 w-5' }: Props) {
  const Icon = MAP[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
