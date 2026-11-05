import { memo, type ReactNode } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polyline,
  Rect,
  Stop,
} from 'react-native-svg';

type IconProps = { size?: number };

/** A plain call, not a component: Defs only needs the gradient element. */
function gradient(id: string, from: string, to: string, horizontal = false) {
  return (
    <LinearGradient
      id={id}
      x1="0"
      y1="0"
      x2={horizontal ? '1' : '0'}
      y2={horizontal ? '0' : '1'}
    >
      <Stop offset="0" stopColor={from} />
      <Stop offset="1" stopColor={to} />
    </LinearGradient>
  );
}

function makeIcon(art: ReactNode) {
  function Icon({ size = 34 }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        {art}
      </Svg>
    );
  }
  return memo(Icon);
}

const PERSON_BODY =
  'M1.6 36C1.6 28.5 8 23.2 14.5 23.2L18.1 25.4L21.7 23.2C28 23.2 34.8 28.5 34.8 36C34.8 38.8 33.4 40.2 31 40.2H5.4C3 40.2 1.6 38.8 1.6 36Z';

function calendar(
  id: string,
  shell: [string, string],
  ring: string,
  panel: [string, string],
  cell: string,
) {
  return (
    <>
      <Defs>
        {gradient(`${id}-shell`, shell[0], shell[1])}
        {gradient(`${id}-panel`, panel[0], panel[1])}
      </Defs>
      <Rect x="3" y="7" width="42" height="38" rx="6.5" fill={`url(#${id}-shell)`} />
      <Rect x="12.5" y="2.5" width="4.4" height="10" rx="2.2" fill={ring} />
      <Rect x="31.1" y="2.5" width="4.4" height="10" rx="2.2" fill={ring} />
      <Rect x="8" y="15.5" width="32" height="24.5" rx="2" fill={`url(#${id}-panel)`} />
      <Rect x="12" y="20" width="6" height="4.6" rx="1.4" fill={cell} />
      <Rect x="30" y="20" width="6" height="4.6" rx="1.4" fill={cell} />
      <Rect x="12" y="29.5" width="6" height="4.6" rx="1.4" fill={cell} />
      <Rect x="21" y="20" width="6" height="14" rx="1.4" fill="#FFFFFF" opacity={0.28} />
    </>
  );
}

function envelope(id: string, from: string, to: string) {
  return (
    <>
      <Defs>{gradient(id, from, to)}</Defs>
      <Rect x="3" y="8" width="42" height="32" rx="4.5" fill={`url(#${id})`} />
      <Polyline
        points="10,15.5 24,26.5 38,15.5"
        fill="none"
        stroke="#E3EFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

const SYNC_ARM = (
  <>
    <Path
      d="M6.6 24.5C6.6 15 15 10.6 28 10.6H31"
      fill="none"
      stroke="url(#sync)"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <Path
      d="M30.5 5.2L41.6 10.8L30.5 16.4Z"
      fill="url(#sync)"
      stroke="url(#sync)"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
  </>
);

const HANDSET =
  'M10.5 3.2C12.8 2.4 15.2 3.4 16.3 5.6L18.4 10C19.4 12 19 14.4 17.3 15.8L15.4 17.4C15 17.8 14.9 18.3 15.1 18.8C17.2 23.6 23.4 29.9 28.7 32.4C29.2 32.6 29.7 32.5 30.1 32.1L31.9 30.2C33.4 28.7 35.7 28.3 37.7 29.2L42.4 31.4C44.6 32.5 45.7 34.9 44.9 37.2C43.8 40.9 40.2 44.2 36.4 44.4C21.4 44.4 3.6 26.6 3.6 11.6C3.8 7.8 6.9 4.3 10.5 3.2Z';

/** Home quick access — the Calls tile's handset in blue. */
export const HandsetBlueIcon = makeIcon(
  <>
    <Defs>{gradient('handset-blue', '#1E7BFF', '#0B5BE8')}</Defs>
    <Path d={HANDSET} fill="url(#handset-blue)" />
  </>,
);

const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

export const QuickActionIcons = {
  leads: makeIcon(
    <>
      <Defs>
        {gradient('leads-head', '#8680FA', '#5F58F3')}
        {gradient('leads-body', '#8E84FB', '#4A42E8', true)}
      </Defs>
      <Ellipse cx="33.5" cy="14" rx="6.8" ry="8.2" fill="#3A34E0" />
      <Path
        d="M27 24.4C38 23.5 46 29.5 46 36.8C46 39.8 44.4 41.2 42 41.2H30Z"
        fill="#3A34E0"
      />
      <Circle cx="18" cy="13" r="8.4" fill="url(#leads-head)" />
      <Path
        d="M2.5 37C2.5 30 9 25 18 25C27 25 33.5 30 33.5 37C33.5 39.8 32 41.5 29 41.5H7C4 41.5 2.5 39.8 2.5 37Z"
        fill="url(#leads-body)"
      />
    </>,
  ),
  'add-lead': makeIcon(
    <>
      <Defs>
        {gradient('add-person', '#1487FD', '#0670F2')}
        {gradient('add-badge', '#FF5B5B', '#EC2A2F')}
      </Defs>
      <Circle cx="18.1" cy="10.5" r="8.9" fill="url(#add-person)" />
      <Path d={PERSON_BODY} fill="url(#add-person)" />
      <Circle cx="36.2" cy="36.2" r="11.2" fill="#FFFFFF" />
      <Circle cx="36.2" cy="36.2" r="9.2" fill="url(#add-badge)" />
      <Path
        d="M36.2 31.6V40.8M31.6 36.2H40.8"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </>,
  ),
  'follow-ups': makeIcon(
    calendar('follow', ['#17BB81', '#0A9F6B'], '#0E8F62', ['#C4F1E0', '#8FE3C6'], '#35C795'),
  ),
  calls: makeIcon(
    <>
      <Defs>{gradient('calls', '#17C672', '#04A856')}</Defs>
      <Path d={HANDSET} fill="url(#calls)" />
    </>,
  ),
  search: makeIcon(
    <>
      <Circle cx="20" cy="20" r="14.5" fill="none" stroke="#FB7C0C" strokeWidth="5" />
      <Line
        x1="31"
        y1="31"
        x2="42.5"
        y2="42.5"
        stroke="#FB7C0C"
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      <Path
        d="M17 12.6C15.2 13.2 13.6 14.6 13 16.4"
        fill="none"
        stroke="#FFD2A8"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>,
  ),
  activities: makeIcon(
    <>
      <Defs>{gradient('activity', '#3A35E6', '#807DF1')}</Defs>
      <Rect x="5" y="27" width="10.5" height="16" rx="3.4" fill="#3A35E6" />
      <Rect x="19" y="18.5" width="10.5" height="24.5" rx="3.4" fill="url(#activity)" />
      <Rect x="33" y="5" width="10.5" height="38" rx="4" fill="url(#activity)" />
      <Line
        x1="24"
        y1="20"
        x2="37.5"
        y2="8"
        stroke="#3A35E6"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </>,
  ),
  inbox: makeIcon(envelope('inbox', '#1E90FF', '#0A78F5')),
  'call-sync': makeIcon(
    <>
      <Defs>{gradient('sync', '#27B4C2', '#0B93A3', true)}</Defs>
      {SYNC_ARM}
      <G transform="rotate(180 24 24)">{SYNC_ARM}</G>
    </>,
  ),
  overdue: makeIcon(
    <>
      <Defs>{gradient('overdue', '#FB6A5E', '#E8352E')}</Defs>
      <Circle cx="24" cy="24" r="20.5" fill="url(#overdue)" />
      <Polyline
        points="24,12.5 24,25 32,30"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>,
  ),
  upcoming: makeIcon(
    <>
      <Defs>{gradient('upcoming', '#FBB62E', '#F08C06')}</Defs>
      <Circle cx="24" cy="24" r="20.5" fill="url(#upcoming)" />
      <Path
        d="M13.5 24H34M26 15.5L34.5 24L26 32.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>,
  ),
  calendar: makeIcon(
    calendar('calendar', ['#F2559F', '#DB2777'], '#BE1F66', ['#FCD5E6', '#F9B4D2'], '#EE6BA8'),
  ),
  unread: makeIcon(
    <>
      {envelope('unread', '#9B72F8', '#7C4DEF')}
      <Circle cx="40" cy="10" r="7.6" fill="#FFFFFF" />
      <Circle cx="40" cy="10" r="5.6" fill="#EC2A2F" />
    </>,
  ),
  profile: makeIcon(
    <>
      <Defs>{gradient('profile', '#1487FD', '#0670F2')}</Defs>
      <Circle cx="24" cy="14.5" r="10.2" fill="url(#profile)" />
      <Path
        d="M5 40C5 31.5 13 27.5 24 27.5C35 27.5 43 31.5 43 40C43 43 41.4 44.5 38.6 44.5H9.4C6.6 44.5 5 43 5 40Z"
        fill="url(#profile)"
      />
    </>,
  ),
  alerts: makeIcon(
    <>
      <Defs>{gradient('alerts', '#FBB62E', '#F08C06')}</Defs>
      <Path
        d="M24 4C16.5 4 11.5 9.7 11.5 17V24C11.5 27 9.8 29 8 31C6.8 32.4 7.6 35 10 35H38C40.4 35 41.2 32.4 40 31C38.2 29 36.5 27 36.5 24V17C36.5 9.7 31.5 4 24 4Z"
        fill="url(#alerts)"
      />
      <Path d="M18.5 38.5C19.5 42 21.5 44 24 44C26.5 44 28.5 42 29.5 38.5Z" fill="#F08C06" />
    </>,
  ),
  settings: makeIcon(
    <>
      {GEAR_TEETH.map((angle) => (
        <Rect
          key={angle}
          x="20"
          y="3"
          width="8"
          height="9"
          rx="2.4"
          fill="#64748B"
          transform={`rotate(${angle} 24 24)`}
        />
      ))}
      <Circle cx="24" cy="24" r="11.5" fill="none" stroke="#64748B" strokeWidth="7.5" />
    </>,
  ),
  about: makeIcon(
    <>
      <Defs>{gradient('about', '#27B4C2', '#0B93A3')}</Defs>
      <Circle cx="24" cy="24" r="20.5" fill="url(#about)" />
      <Circle cx="24" cy="14.5" r="2.9" fill="#FFFFFF" />
      <Rect x="21.6" y="20.5" width="4.8" height="16" rx="2.4" fill="#FFFFFF" />
    </>,
  ),
} as const;

export type QuickActionIconKey = keyof typeof QuickActionIcons;

/** Dark mode reuses each icon's colour at low alpha, as pastels would glare. */
export const QuickActionTints: Record<
  QuickActionIconKey,
  { light: string; dark: string }
> = {
  leads: { light: '#EAE8FE', dark: '#6B63F733' },
  'add-lead': { light: '#DAE9FE', dark: '#0A7AFC33' },
  'follow-ups': { light: '#DAF4EF', dark: '#0AAB7533' },
  calls: { light: '#DFF7E7', dark: '#01B86133' },
  search: { light: '#FDEADB', dark: '#FB7C0C33' },
  activities: { light: '#E7E4FD', dark: '#6766DE33' },
  inbox: { light: '#DDEEFE', dark: '#1E90FF33' },
  'call-sync': { light: '#DAF6F9', dark: '#27B4C233' },
  overdue: { light: '#FDE6E4', dark: '#E8352E33' },
  upcoming: { light: '#FEF0D5', dark: '#F08C0633' },
  calendar: { light: '#FCE5F0', dark: '#DB277733' },
  unread: { light: '#EEE7FE', dark: '#7C4DEF33' },
  profile: { light: '#DAE9FE', dark: '#0A7AFC33' },
  alerts: { light: '#FEF0D5', dark: '#F08C0633' },
  settings: { light: '#E8ECF2', dark: '#64748B33' },
  about: { light: '#DAF6F9', dark: '#27B4C233' },
};
