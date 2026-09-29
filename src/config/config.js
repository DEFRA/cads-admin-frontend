import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import convictFormatWithValidator from 'convict-format-with-validator'
import { buildLogSchema } from './schema/logging.js'
import { buildSessionSchema } from './schema/session.js'
import { buildRedisSchema } from './schema/redis.js'
import { buildOidcSchema } from './schema/oidc.js'
import { buildAzureSchema } from './schema/azure.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Add custom formats once
convict.addFormats(convictFormatWithValidator)

// Lazily computed environment flags
function getEnvFlags() {
  const env = process.env.NODE_ENV
  return {
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    isTest: env === 'test'
  }
}

// Lazily built schema
function buildSchema() {
  const oneWeekMs = 604800000
  const { isProduction, isDevelopment, isTest } = getEnvFlags()

  return {
    serviceVersion: {
      doc: 'The service version, this variable is injected into your docker container in CDP environments',
      format: String,
      nullable: true,
      default: null,
      env: 'SERVICE_VERSION'
    },
    host: {
      doc: 'The IP address to bind',
      format: 'ipaddress',
      default: '0.0.0.0',
      env: 'HOST'
    },
    port: {
      doc: 'The port to bind.',
      format: 'port',
      default: 3010,
      env: 'PORT'
    },
    staticCacheTimeout: {
      doc: 'Static cache timeout in milliseconds',
      format: Number,
      default: oneWeekMs,
      env: 'STATIC_CACHE_TIMEOUT'
    },
    serviceName: {
      doc: 'Applications Service Name',
      format: String,
      default: 'CADS ADMIN MONITORING'
    },
    root: {
      doc: 'Project root',
      format: String,
      default: path.resolve(dirname, '../..')
    },
    assetPath: {
      doc: 'Asset path',
      format: String,
      default: '/public',
      env: 'ASSET_PATH'
    },
    isProduction: {
      doc: 'If this application running in the production environment',
      format: Boolean,
      default: isProduction
    },
    isDevelopment: {
      doc: 'If this application running in the development environment',
      format: Boolean,
      default: isDevelopment
    },
    isTest: {
      doc: 'If this application running in the test environment',
      format: Boolean,
      default: isTest
    },
    httpProxy: {
      doc: 'HTTP Proxy',
      format: String,
      nullable: true,
      default: null,
      env: 'HTTP_PROXY'
    },
    isSecureContextEnabled: {
      doc: 'Enable Secure Context',
      format: Boolean,
      default: isProduction,
      env: 'ENABLE_SECURE_CONTEXT'
    },
    isMetricsEnabled: {
      doc: 'Enable metrics reporting',
      format: Boolean,
      default: isProduction,
      env: 'ENABLE_METRICS'
    },
    nunjucks: {
      watch: {
        doc: 'Reload templates when they are changed.',
        format: Boolean,
        default: isDevelopment
      },
      noCache: {
        doc: 'Use a cache and recompile templates each time',
        format: Boolean,
        default: isDevelopment
      }
    },
    tracing: {
      header: {
        doc: 'Which header to track',
        format: String,
        default: 'x-cdp-request-id',
        env: 'TRACING_HEADER'
      }
    },
    cadsBackendUrl: {
      doc: 'CADS Backend API base URL',
      format: String,
      default: 'http://localhost:5555',
      env: 'CADS_BACKEND_URL'
    },
    log: buildLogSchema({ isProduction }),
    session: buildSessionSchema({ isProduction }),
    redis: buildRedisSchema({ isProduction }),
    oidc: buildOidcSchema(),
    azure: buildAzureSchema()
  }
}

let cachedConfig

export function getConfig() {
  if (!cachedConfig) {
    const schema = buildSchema()
    cachedConfig = convict(schema).validate({ allowed: 'strict' })
  }
  return cachedConfig
}
