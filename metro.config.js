const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Reduce file-watcher pressure on Windows (helps avoid EMFILE: too many open files).
config.watchFolders = [projectRoot];
config.resolver.blockList = [
  // Ignore nested caches / git / build outputs from watch + transform
  /.*[/\\]\.git[/\\].*/,
  /.*[/\\]android[/\\]build[/\\].*/,
  /.*[/\\]android[/\\]\.gradle[/\\].*/,
  /.*[/\\]ios[/\\]Pods[/\\].*/,
  /.*[/\\]ios[/\\]build[/\\].*/,
];

module.exports = config;
