const { getDefaultConfig } = require('expo/metro-config');
const os = require('os');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Windows often hits EMFILE during parallel transform + metro-cache reads.
// Cap workers so BinaryFileStore doesn't open thousands of handles at once.
// Keep this low on Windows — higher concurrency reliably hits EMFILE.
config.maxWorkers = 2;

// Keep watcher scoped to this app only.
config.watchFolders = [projectRoot];
config.resolver.blockList = [
  /.*[/\\]\.git[/\\].*/,
  /.*[/\\]android[/\\]build[/\\].*/,
  /.*[/\\]android[/\\]\.gradle[/\\].*/,
  /.*[/\\]ios[/\\]Pods[/\\].*/,
  /.*[/\\]ios[/\\]build[/\\].*/,
];

module.exports = config;
