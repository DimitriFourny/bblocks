const path = require('node:path');
const fs = require('node:fs');
const webpack = require('webpack');

// Preserve the complete notices inside each standalone bundle, after minification.
const licenseBanner = [
  '@license BBlocks',
  fs.readFileSync(path.join(__dirname, 'LICENSE'), 'utf8'),
  'Bundled @dagrejs/dagre and @dagrejs/graphlib:',
  fs.readFileSync(require.resolve('@dagrejs/dagre/LICENSE'), 'utf8'),
  fs.readFileSync(require.resolve('@dagrejs/graphlib/LICENSE'), 'utf8')
].join('\n\n');

const shared = {
  entry: './src/index.ts',
  target: ['web', 'es2020'],
  plugins: [new webpack.BannerPlugin({
    banner: licenseBanner,
    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
  })],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: { declaration: false, emitDeclarationOnly: false }
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  resolve: { extensions: ['.ts', '.js'] },
  optimization: { minimize: true }
};

module.exports = [
  {
    ...shared,
    name: 'umd',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bblocks.js',
      library: { name: 'bblocks', type: 'umd' },
      globalObject: 'globalThis'
    }
  },
  {
    ...shared,
    name: 'esm',
    experiments: { outputModule: true },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bblocks.mjs',
      library: { type: 'module' }
    }
  }
];
