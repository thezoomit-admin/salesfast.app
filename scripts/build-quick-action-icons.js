const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../assets/images/quick-actions');
const out = path.join(
  __dirname,
  '../src/components/home/QuickActionIcons.tsx',
);

/** SVG-backed tiles. */
const svgKeys = [
  'leads',
  'follow-ups',
  'calls',
  'inbox',
];

/** PNG assets used as-is (key → filename without path). */
const pngKeys = {
  search: 'search.png',
  'add-lead': 'add-lead.png',
  activities: 'activities.png',
  'call-sync': 'call-sync.png',
  overdue: 'overdue.png',
  upcoming: 'upcoming.png',
  calendar: 'calendar.png',
  unread: 'unread.png',
  profile: 'profile.png',
  alerts: 'alerts.png',
  settings: 'settings.png',
  about: 'about.png',
};

const allKeys = [
  'leads',
  'add-lead',
  'follow-ups',
  'calls',
  'search',
  'activities',
  'inbox',
  'call-sync',
  'overdue',
  'upcoming',
  'calendar',
  'unread',
  'profile',
  'alerts',
  'settings',
  'about',
];

const xml = {};
for (const key of svgKeys) {
  let raw = fs.readFileSync(path.join(dir, `${key}.svg`), 'utf8').trim();
  raw = raw
    .replace(/ class="[^"]*"/g, '')
    .replace(/ style="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  xml[key] = raw;
}

let src = `// Sourced from veryicon.com / flaticon reference assets.
import { memo } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import { SvgXml } from 'react-native-svg';

type IconProps = { size?: number };

`;

for (const [key, file] of Object.entries(pngKeys)) {
  const constName = key.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() + '_PNG';
  src += `const ${constName} = require('../../../assets/images/quick-actions/${file}');\n`;
}

src += `
const XML = {
`;

for (const key of svgKeys) {
  src += `  ${JSON.stringify(key)}: ${JSON.stringify(xml[key])},\n`;
}

src += `} as const;

function makeIcon(key: keyof typeof XML) {
  function Icon({ size = 34 }: IconProps) {
    return (
      <SvgXml
        xml={XML[key]}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }
  return memo(Icon);
}

function makePngIcon(source: ImageSourcePropType) {
  function Icon({ size = 34 }: IconProps) {
    return (
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }
  return memo(Icon);
}

export const QuickActionIcons = {
`;

for (const key of allKeys) {
  if (pngKeys[key]) {
    const constName = key.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() + '_PNG';
    src += `  '${key}': makePngIcon(${constName}),\n`;
  } else {
    src += `  '${key}': makeIcon('${key}'),\n`;
  }
}

src += `} as const;

export type QuickActionIconKey = keyof typeof QuickActionIcons;
`;

fs.writeFileSync(out, src);
console.log('wrote', out, fs.statSync(out).size);
