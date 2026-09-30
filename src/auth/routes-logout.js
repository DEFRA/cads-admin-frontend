import { getAuthConfig } from './config/auth-config.js'
import { dropSession } from './session-store.js'
import { getRequestOrigin } from './helpers/request-origin.js'
import crypto from 'node:crypto'

/**
 * @satisfies {import('@hapi/hapi').ServerRoute[]}
 */
export const logoutRoutes = [
  {
    method: ['GET'],
    path: '/logout',
    options: {
      auth: {
        mode: 'try',
        strategy: 'session'
      }
    },
    handler: async (request, h) => {
      const cookie = request.auth.artifacts

      if (cookie?.sessionId) {
        await dropSession(cookie.sessionId)
      }

      if (request.cookieAuth?.clear) {
        request.cookieAuth.clear()
      } else {
        h.unstate('sid')
      }

      const authConfig = getAuthConfig()
      const idToken = request.auth.credentials?.tokenSet?.id_token
      const url = new URL(authConfig.externalEndSessionEndpoint)

      if (idToken) {
        url.searchParams.set('id_token_hint', idToken)
      }

      url.searchParams.set(
        'post_logout_redirect_uri',
        `${getRequestOrigin(request)}${authConfig.postLogoutRedirectPath}`
      )
      url.searchParams.set('state', crypto.randomUUID())

      return h.redirect(url.toString())
    }
  },
  {
    method: ['GET'],
    path: '/auth/signed-out',
    options: {
      auth: false
    },
    handler: async (_request, h) => {
      return h.redirect('/')
    }
  }
]
