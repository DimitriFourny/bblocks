const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    filename: 'bblocks.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'bblocks',
    libraryTarget: 'umd',
    libraryExport: 'default'
  },
  optimization: {
    minimize: true,
  },
};