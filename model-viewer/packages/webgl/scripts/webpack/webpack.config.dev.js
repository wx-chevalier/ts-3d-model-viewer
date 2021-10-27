const path = require('path');
// webpack 版本问题导致启动报错，故修改
// const { merge } = require('webpack-merge');
// const merge = require('webpack-merge');
const { merge } = require('webpack-merge');

const devConfig = require('../../../../scripts/webpack/webpack.config').devConfig;

module.exports = merge(devConfig, {
  entry: {
    index: path.resolve(__dirname, '../../example')
  },
  devServer: {
    contentBase: path.resolve(__dirname, '../../public')
  }
});
