const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');

module.exports = function override(config, env) {

// add raw loader to import file as string
  config.module.rules.push({
    test: /\.(txt|md)$/i,
    use: { loader: 'raw-loader'}
  });
  
  // Remove plugin ModuleScopePlugin to allow import outside src/
  config.resolve.plugins = config.resolve.plugins.filter(plugin => !(plugin instanceof ModuleScopePlugin));


  return config;
}