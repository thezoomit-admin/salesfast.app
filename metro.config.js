const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
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
