const buildTarget = process.env.TARO_ENV
const outputRoot = buildTarget === 'weapp'
  ? 'dist/weapp'
  : buildTarget === 'h5'
    ? 'dist/h5'
    : 'dist'

const config = {
  projectName: 'campus-helper-miniapp',
  date: '2026-03-12',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot,
  plugins: [],
  defineConstants: {
    TARO_APP_SUPABASE_URL: JSON.stringify(process.env.TARO_APP_SUPABASE_URL || ''),
    TARO_APP_SUPABASE_ANON_KEY: JSON.stringify(process.env.TARO_APP_SUPABASE_ANON_KEY || ''),
    TARO_APP_AMAP_KEY: JSON.stringify(process.env.TARO_APP_AMAP_KEY || ''),
    TARO_APP_AMAP_WEB_KEY: JSON.stringify(process.env.TARO_APP_AMAP_WEB_KEY || ''),
    TARO_APP_AMAP_JS_KEY: JSON.stringify(process.env.TARO_APP_AMAP_JS_KEY || ''),
    TARO_APP_AMAP_SECURITY_KEY: JSON.stringify(process.env.TARO_APP_AMAP_SECURITY_KEY || ''),
    TARO_APP_MAP_WEBVIEW_URL: JSON.stringify(process.env.TARO_APP_MAP_WEBVIEW_URL || '')
  },
  copy: {
    patterns: [
      { from: 'src/static/amap-h5.html', to: `${outputRoot}/static/amap-h5.html` }
    ],
    options: {}
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false
  },
  mini: {
    webpackChain(chain) {
      chain.resolve.extensions.prepend('.mjs')
      chain.module.rule('mjs').test(/\.mjs$/).include.add(/node_modules/).end().type('javascript/auto')
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    router: {
      mode: 'hash'
    },
    postcss: {
      autoprefixer: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  }
}

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'))
  }
  return merge({}, config, require('./prod'))
}
