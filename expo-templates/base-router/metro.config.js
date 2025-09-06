const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const os = require('os');

const config = getDefaultConfig(__dirname);

// 🚀 PERFORMANCE: Enable aggressive caching for lightning-fast rebuilds
// Using Metro's default caching mechanism (more reliable across versions)

// 🚀 PERFORMANCE: Optimize resolver for faster module resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'expo.ts',
  'expo.tsx', 
  'expo.js',
  'expo.jsx',
];

// 🚀 PERFORMANCE: Enable symlink support for workspace compatibility
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// 🚀 PERFORMANCE: Optimize transformer for faster builds
config.transformer.minifierConfig = {
  ecma: 8,
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// 🚀 PERFORMANCE: Enable parallel processing (use all CPU cores)
config.maxWorkers = Math.max(1, os.cpus().length - 1);

// 🚀 PERFORMANCE: Optimize watchman for faster file watching
config.watchFolders = [__dirname];

// 🚀 PERFORMANCE: Exclude unnecessary files from watching
config.resolver.blockList = [
  /node_modules\/.*\/Pods\/.*/,
  /.*\/android\/app\/build\/.*/,
  /.*\/ios\/build\/.*/,
  /.*\/\.git\/.*/,
  /.*\/\.vscode\/.*/,
  /.*\/\.idea\/.*/,
];

module.exports = config;