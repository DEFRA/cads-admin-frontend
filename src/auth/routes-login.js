import { getAuthConfig } from './config/auth-config.js'
import { generators } from 'openid-client'
import { getOidcClient } from './oidc-client.js'
import { dropSession, getSession, setSession } from './session-store.js'
import { getRequestOrigin } from './helpers/request-origin.js'
import crypto from 'node:crypto'

/**
 * @satisfies {import('@hapi/hapi').ServerRoute[]}
 */
export const loginRoutes = [
  {
    method: ['GET'],
    path: '/login',
    options: {
      auth: {
        mode: 'try',
        strategy: 'session'
      }
    },
    handler: async (request, h) => {
      const authConfig = getAuthConfig()

      if (request.cookieAuth?.clear) {
        request.cookieAuth.clear()
      } else {
        h.unstate('sid')
      }

      // Generate state + nonce for security
      const state = generators.state()
      const nonce = generators.nonce()

      // Store handshake data in Redis
      const tempSessionId = `oidc:${state}`

      await setSession(tempSessionId, {
        oidcState: state,
        oidcNonce: nonce,
        redirectTo: request.app.redirectTo || authConfig.defaultRedirect
      })

      // Set cookie containing only the temp sessionId
      request.cookieAuth.set({ sessionId: tempSessionId })

      const url = new URL(authConfig.externalAuthorizeEndpoint)

      const redirectUri = `${getRequestOrigin(request)}${authConfig.redirectPath}`

      url.searchParams.set('client_id', authConfig.clientId)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('scope', authConfig.scope)
      url.searchParams.set('state', state)
      url.searchParams.set('nonce', nonce)

      return h.redirect(url.toString())
    }
  },
  {
    method: ['GET'],
    path: '/auth/callback',
    options: {
      auth: {
        mode: 'try',
        strategy: 'session'
      }
    },
    handler: async (request, h) => {
      const authConfig = getAuthConfig()
      const oidcClient = await getOidcClient()

      if (request.query.error) {
        if (request.cookieAuth?.clear) {
          request.cookieAuth.clear()
        } else {
          h.unstate('sid')
        }
        return h.redirect('/?error=' + encodeURIComponent(request.query.error))
      }

      // Extract params from the callback URL
      const callbackParams = oidcClient.callbackParams(request.raw.req)
      const cookie = request.state?.sid ?? request.auth?.credentials
      if (!cookie?.sessionId) {
        throw new Error('Missing session cookie')
      }

      const handshake = await getSession(cookie.sessionId)
      if (!handshake?.oidcState || !handshake?.oidcNonce) {
        throw new Error('Missing OIDC state/nonce')
      }

      const { oidcState, oidcNonce, redirectTo } = handshake

      // Exchange the code for tokens
      const redirectUri = `${getRequestOrigin(request)}${authConfig.redirectPath}`
      const tokenSet = await oidcClient.callback(redirectUri, callbackParams, {
        state: oidcState,
        nonce: oidcNonce
      })

      // Extract user claims from ID token
      const claims = tokenSet.claims()

      // Use the subject (sub) as the session ID
      const sessionId = crypto.randomUUID()

      const roles = []
      const permissions = []

      // Store session in Redis
      await setSession(sessionId, {
        sessionId,
        userSub: claims.sub,
        tokenSet,
        user: {
          ...claims,
          roles,
          permissions
        }
      })

      // Set the session cookie
      request.cookieAuth.set({ sessionId })

      // Delete the temporary handshake session
      await dropSession(cookie.sessionId)

      // Redirect user back to the app
      const redirectUrl = redirectTo || authConfig.defaultRedirect
      return h.redirect(redirectUrl)
    }
  }
]
