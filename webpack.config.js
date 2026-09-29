import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'path'
import CopyPlugin from 'copy-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { WebpackAssetsManifest } from 'webpack-assets-manifest'

const require = createRequire(import.meta.url)
const dirname = path.dirname(fileURLToPath(import.meta.url))

const govukFrontendPath = path.dirname(
  require.resolve('govuk-frontend/package.json')
)

const ruleTypeAssetResource = 'asset/resource'

export default (_env, argv) => {
  const isProd = argv.mode === 'production'

  return {
    context: path.resolve(dirname, 'src/client'),
    entry: {
      application: {
        import: [
          './javascripts/application.js',
          './stylesheets/application.scss'
        ]
      }
    },
    experiments: {
      outputModule: true
    },
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? 'source-map' : 'inline-source-map',
    watchOptions: {
      aggregateTimeout: 200,
      poll: 1000
    },
    output: createOutput(isProd, dirname),
    resolve: createResolve(govukFrontendPath),
    module: {
      rules: createModuleRules(isProd, dirname, ruleTypeAssetResource)
    },
    optimization: createOptimization(isProd),
    plugins: createPlugins(dirname, govukFrontendPath),
    stats: createStats(),
    target: 'browserslist:javascripts'
  }
}

function createOutput(isProd, baseDir) {
  return {
    clean: true,
    filename: isProd
      ? 'javascripts/[name].[contenthash:7].min.js'
      : 'javascripts/[name].js',
    chunkFilename: isProd
      ? 'javascripts/[name].[chunkhash:7].min.js'
      : 'javascripts/[name].js',
    path: path.join(baseDir, '.public'),
    publicPath: '/public/',
    libraryTarget: 'module',
    module: true
  }
}

function createModuleRules(isProd, baseDir, assetResourceRuleType) {
  return [
    {
      test: /\.(js|mjs|scss)$/,
      loader: 'source-map-loader',
      enforce: 'pre'
    },
    {
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/,
      options: {
        browserslistEnv: 'javascripts',
        cacheDirectory: true,
        extends: path.join(baseDir, 'babel.config.cjs'),
        presets: [['@babel/preset-env']]
      },
      sideEffects: false
    },
    {
      test: /\.scss$/,
      type: assetResourceRuleType,
      generator: {
        binary: false,
        filename: isProd
          ? 'stylesheets/[name].[contenthash:7].min.css'
          : 'stylesheets/[name].css'
      },
      use: [
        'postcss-loader',
        {
          loader: 'sass-loader',
          options: {
            sassOptions: {
              loadPaths: [
                path.join(baseDir, 'src/client/stylesheets'),
                path.join(baseDir, 'src/server/common/components'),
                path.join(baseDir, 'src/server/common/templates/partials')
              ],
              quietDeps: true,
              sourceMapIncludeSources: true,
              style: 'expanded'
            },
            warnRuleAsWarning: true
          }
        }
      ]
    },
    {
      test: /\.(png|svg|jpe?g|gif|ico)$/,
      type: assetResourceRuleType,
      generator: { filename: 'assets/images/[name][ext]' }
    },
    {
      test: /\.(woff|woff2|eot|ttf|otf)$/,
      type: assetResourceRuleType,
      generator: { filename: 'assets/fonts/[name][ext]' }
    }
  ]
}

function createOptimization(isProd) {
  return {
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: { passes: 2 },
          format: { comments: false },
          sourceMap: { includeSources: true },
          safari10: true
        }
      })
    ],
    providedExports: true,
    sideEffects: true,
    usedExports: true
  }
}

function createPlugins(baseDir, govukPath) {
  return [
    new WebpackAssetsManifest(),
    new CopyPlugin({
      patterns: [
        {
          from: path.join(govukPath, 'dist/govuk/assets'),
          to: 'assets',
          globOptions: {
            ignore: [
              path.join(govukPath, 'dist/govuk/assets/rebrand'),
              path.join(govukPath, 'dist/govuk/assets/images')
            ]
          }
        },
        {
          from: path.join(govukPath, 'dist/govuk/assets/rebrand'),
          to: 'assets'
        },
        {
          from: path.join(baseDir, 'public/assets'),
          to: 'assets'
        },
        {
          from: path.join(dirname, 'public/assets'),
          to: 'assets'
        }
      ]
    })
  ]
}

function createStats() {
  return {
    errorDetails: true,
    loggingDebug: ['sass-loader'],
    preset: 'minimal'
  }
}

function createResolve(govukPath) {
  return {
    alias: {
      '/public/assets': path.join(govukPath, 'dist/govuk/assets')
    }
  }
}
