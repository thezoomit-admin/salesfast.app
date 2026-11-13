const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

// react-native-tab-view keeps one page on each side. A tab two away is built
// on tap, which is the hitch. Re-apply after npm install; Metro bundles
// lib/module, the TS source is there for the same edit.
function keepEveryTabComposed() {
  const targets = [
    {
      file: path.join(
        projectRoot,
        'node_modules/react-native-tab-view/lib/module/PagerViewAdapter.js'
      ),
      from: 'scrollEnabled: swipeEnabled,\n      children: children',
      to: 'scrollEnabled: swipeEnabled,\n      offscreenPageLimit: 5,\n      children: children',
    },
    {
      file: path.join(
        projectRoot,
        'node_modules/react-native-tab-view/src/PagerViewAdapter.tsx'
      ),
      from: 'scrollEnabled={swipeEnabled}\n      >',
      to: 'scrollEnabled={swipeEnabled}\n        offscreenPageLimit={5}\n      >',
    },
  ];
  for (const { file, from, to } of targets) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('offscreenPageLimit')) continue;
    if (!text.includes(from)) continue;
    fs.writeFileSync(file, text.replace(from, to));
  }
}

keepEveryTabComposed();

const config = getDefaultConfig(projectRoot);

// Windows EMFILE: Temp metro-cache BinaryFileStore opens too many handles.
// 1 worker + no persistent cache avoids that failure mode.
config.maxWorkers = 1;
config.cacheStores = [];

// Keep watcher scoped to this app only.
config.watchFolders = [projectRoot];
config.resolver.blockList = [
  /.*[/\\]\.git[/\\].*/,
  /.*[/\\]android[/\\]build[/\\].*/,
  /.*[/\\]android[/\\]\.gradle[/\\].*/,
  /.*[/\\]ios[/\\]Pods[/\\].*/,
  /.*[/\\]ios[/\\]build[/\\].*/,
  /.*[/\\]node_modules[/\\]\.cache[/\\].*/,
];

module.exports = config;
