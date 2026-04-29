const baseConfig = require('openmrs/default-webpack-config');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = function (env, argv) {
  const config = typeof baseConfig === 'function' ? baseConfig(env, argv) : baseConfig;

  if (config.plugins) {
    // Remove ForkTsCheckerWebpackPlugin to avoid OOM in the child TS-checker process
    config.plugins = config.plugins.filter(
      (plugin) => !(plugin instanceof ForkTsCheckerWebpackPlugin),
    );
  }

  // Disable source maps to reduce peak memory during build (OOM avoidance)
  config.devtool = false;

  return config;
};
