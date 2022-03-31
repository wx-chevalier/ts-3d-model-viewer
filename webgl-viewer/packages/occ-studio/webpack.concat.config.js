const path = require('path');
const uglifyJS = require('uglify-js');
const CleanCSS = require('clean-css');
const MergeIntoSingle = require('webpack-merge-and-include-globally');
// const MergeIntoSingle = require('./index.js');

// Webpack Config
const webpackConfig = {
  devServer: {
    contentBase: path.join(__dirname, 'example'),
    compress: true,
    port: 3000,
    open: true,
  },
  mode: 'none',
  entry: ['./js/main.js'],
  devtool: 'cheap-module-source-map',
  output: {
    filename: 'deprecated.js',
    path: path.resolve(__dirname, './dist'),
  },
  resolve: {
    extensions: ['.js', '.css'],
  },
  plugins: [
    new MergeIntoSingle(
      {
        files: [
          {
            src: [
              './js/CADWorker/main.js',
              './libs/three/build/three.min.js',
              './js/CADWorker/CascadeStudioStandardUtils.js',
              './js/CADWorker/CascadeStudioStandardLibrary.js',
              './js/CADWorker/CascadeStudioShapeToMesh.js',
              './libs/opencascade.js/dist/opencascade.wasm.js',
              './libs/opentype.js/dist/opentype.min.js',
              './libs/potpack/index.js',
              './js/CADWorker/CascadeStudioMainWorker.js',
              './js/CADWorker/CascadeStudioFileUtils.js',
            ],
            // dest: code => {
            //   return { 'cad-worker.js': code };
            // },
            dest: code => {
              const min = uglifyJS.minify(code, {
                sourceMap: {
                  filename: 'cad-worker.js',
                  url: 'cad-worker.js.map',
                },
              });
              return {
                'cad-worker.js': min.code,
                'cad-worker.js.map': min.map,
              };
            },
          },
          {
            src: ['example/test.css'],
            dest: code => ({
              'style.css': new CleanCSS({}).minify(code).styles,
            }),
          },
        ],

        hash: false,
      },
      filesMap => {
        console.log('generated files: ', filesMap); // eslint-disable-line no-console
      },
    ),
  ],
  module: {
    rules: [{ test: /\.html$/, loader: 'raw-loader' }],
  },
};

module.exports = webpackConfig;
