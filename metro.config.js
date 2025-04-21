const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('web.js', 'web.ts', 'web.tsx');
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'ttf', 'otf', 'svg');

module.exports = config;
