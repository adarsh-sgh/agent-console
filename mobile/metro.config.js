// shared/ sits outside this app, so Metro has to watch it and keep module resolution here.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const sharedSrc = path.resolve(projectRoot, "../shared/src");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [sharedSrc];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = { "@shared": sharedSrc };

module.exports = config;
