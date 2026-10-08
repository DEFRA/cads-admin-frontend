import path from 'node:path'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import Cookie from '@hapi/cookie'

import { router } from './router.js'
import { getConfig } from '../config/config.js'

import { pulse } from './common/helpers/pulse.js'
import { catchAll } from './common/helpers/errors.js'
import { nunjucksConfig } from '../config/nunjucks/nunjucks.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { getRequestTracing } from './common/helpers/request-tracing.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './common/helpers/content-security-policy.js'

import { registerSessionMiddleware } from '../auth/session-middleware.js'
import { loginRoutes } from '../auth/routes-login.js'
import { logoutRoutes } from '../auth/routes-logout.js'
import { debugAuthRoutes } from '../auth/debug/debug-routes.js'
import { getSessionAuthStrategy } from '../auth/plugins/session-strategy.js'

export async function createServer() {
  setupProxy()

  // Lazily read config values
  const config = getConfig()
  const host = config.get('host')
  const port = config.get('port')
  const root = config.get('root')

  const sessionCacheName = config.get('session.cache.name')
  const sessionCacheEngine = config.get('session.cache.engine')

  const server = hapi.server({
    host,
    port,
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(root, '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: sessionCacheName,
        engine: getCacheEngine(sessionCacheEngine)
      }
    ],
    state: {
      strictHeader: false
    }
  })

  // Register cookieAuth (persistent session cookie)
  await server.register(Cookie)

  const authStrategy = getSessionAuthStrategy()
  server.auth.strategy(
    authStrategy.name,
    authStrategy.scheme,
    authStrategy.options
  )

  server.auth.default('session')

  // Register your plugins + global router
  await server.register([
    requestLogger,
    getRequestTracing(),
    secureContext,
    pulse,
    nunjucksConfig,
    Scooter,
    contentSecurityPolicy,
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  // await server.register(getSessionCache())

  // Register auth routes (login, callback, logout)
  server.route([...loginRoutes, ...logoutRoutes])

  // Debug auth routes
  if (config.get('oidc.enableDebugEndpoints')) {
    if (config.get('isProduction')) {
      server.logger.warn(
        'OIDC_ENABLE_DEBUG_ENDPOINTS is set but ignored in production'
      )
    } else {
      server.route([...debugAuthRoutes])
    }
  }

  // Register session middleware (Redis session + token refresh)
  registerSessionMiddleware(server)

  // Global error handler
  server.ext('onPreResponse', catchAll)

  return server
}
