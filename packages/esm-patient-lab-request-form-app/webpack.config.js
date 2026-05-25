const baseConfig = require('openmrs/default-webpack-config');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = function (env, argv) {
  const config = typeof baseConfig === 'function' ? baseConfig(env, argv) : baseConfig;

  if (config.plugins) {
    config.plugins = config.plugins.filter(
      (plugin) => !(plugin instanceof ForkTsCheckerWebpackPlugin),
    );
  }

  config.devtool = false;

  return config;
};
