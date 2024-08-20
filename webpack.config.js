const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'my-solana-project'),
  },
  mode: 'development',
  devtool: 'source-map',
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "process": require.resolve("process/browser"),
      "buffer": require.resolve("buffer/"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};
