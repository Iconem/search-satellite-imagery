const resolve = require('path').resolve;
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const smp = new SpeedMeasurePlugin();

const CompressionPlugin = require('compression-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

// For env variables passing to the frontend code (webpack replaces occurences of process.env.var by their respective value)
// Can more simply use Dotenv plugin with .env filepath and safe: true param
// Otherwise, could also use below code
// ---
// const dotenv = require('dotenv');
// // call dotenv and it will return an Object with a parsed key
// const env = dotenv.config().parsed;
// console.log(env)
// const envKeys = Object.keys(env).reduce((prev, next) => {
//   prev[`process.env.${next}`] = JSON.stringify(env[next]);
//   return prev;
// }, {});

// console.log('\n\n\nenv', env)

const config = smp.wrap({
  entry: {
    app: resolve('./src/app'),
  },

  output: {
    library: 'App',

    // clean: false,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    fallback: {
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'), // if you want to use this module also don't forget npm i crypto-browserify
    },
  },

  module: {
    rules: [
      // The below rule does create sourcemaps for node_modules which do not have any like react-map-gl, ky, math-gl
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
      {
        test: /\.(ts|js)x?$/,
        include: [resolve('./src')],
        exclude: [/node_modules/],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/env', '@babel/react'],
            },
          },
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
      },

      // {
      //   test: /\.html/,
      //   type: 'asset/resource'
      // },
      // {
      //   test: /favicon\.svg/,
      //   type: 'asset/resource'
      // }
    ],
  },

  // Read environment variable. Recommended way is to simply use Dotenv with .env at root of project
  // https://webpack.js.org/plugins/environment-plugin/
  plugins: [
    new Dotenv({
      path: './.env', // Path to .env file (this is the default)
      safe: true, // load .env.example (defaults to "false" which does not use dotenv-safe)
      systemvars: true, // Set to true if you would rather load all system variables as well (useful for CI purposes)
    }),
    // new CompressionPlugin(),
    // Other way to add index.html to dist
    // new AddAssetHtmlPlugin({ filepath: require.resolve('./index.html') }),
    new CleanWebpackPlugin({
      verbose: true,
      dry: false,
      cleanAfterEveryBuildPatterns: ['!**/favicon.svg'],
    }),
    new AddAssetHtmlPlugin({ filepath: require.resolve('./favicon.svg') }),
    new HtmlWebpackPlugin({
      template: './index.html',
      inject: false,
      favicon: './favicon.svg',
      title: 'Search EO imagery - Iconem',
    }),
  ],
});

// Enables bundling against src in this repo rather than the installed version
module.exports = config;
