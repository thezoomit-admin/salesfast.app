const fs = require('fs');
const path = require('path');
const m = require('../../salesfast.admin/node_modules/@hugeicons/core-free-icons');

const keys = [
  'FileEditIcon',
  'Tick02Icon',
  'Location01Icon',
  'HandshakeIcon',
  'TrophyIcon',
  'Call02Icon',
  'UserAdd01Icon',
  'ApartmentIcon',
  'CancelCircleIcon',
  'FlameIcon',
  'MinusSignIcon',
  'ArrowDownDoubleIcon',
];

function toTs(name, icon) {
  const lines = icon.map(([tag, attrs]) => {
    const { key, ...rest } = attrs;
    const props = Object.entries(rest)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    return `  ['${tag}', { ${props}, key: '${key}' }]`;
  });
  return `export const ${name}: IconSvgElement = [\n${lines.join(',\n')},\n];\n`;
}

let out = '\n/** Pipeline + priority — same Hugeicons as web LeadDetailPage. */\n';
for (const k of keys) out += `\n${toTs(k, m[k])}`;

const target = path.join(__dirname, '../src/components/icons/hugeicons.ts');
fs.appendFileSync(target, out);
console.log('appended', keys.length, 'icons');
