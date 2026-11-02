const { getDefaultConfig } = require('expo/metro-config');
const os = require('os');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Windows often hits EMFILE during parallel transform + metro-cache reads.
// Cap workers so BinaryFileStore doesn't open thousands of handles at once.
config.maxWorkers = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2) || 2));

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
