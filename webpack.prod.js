const resolve = require('path').resolve;
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const smp = new SpeedMeasurePlugin();

const config = smp.wrap(merge(common, {
  mode: 'production',

}));

// Enables bundling against src in this repo rather than the installed version
module.exports = env => {
  return env && env.local ? require('../webpack.config.local')(config)(env) : config;
}
