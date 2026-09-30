/* istanbul ignore file */

import { getSession } from '../session-store.js'

/**
 * @satisfies {import('@hapi/hapi').ServerRoute[]}
 */
export const debugAuthRoutes = [
  {
    method: 'GET',
    path: '/auth/debug/session',
    options: {
      auth: {
        mode: 'try',
        strategy: 'session'
      }
    },
    handler: async (request, h) => {
      const sid = request.state.sid?.sessionId

      if (!sid) {
        return h.response({ error: 'No sid cookie present' })
      }

      const data = await getSession(sid)

      if (!data) {
        return h.response({ error: 'Session not found in Redis' })
      }

      return h.response({
        sessionId: data.sessionId,
        idToken: data.tokenSet?.id_token,
        accessToken: data.tokenSet?.access_token,
        expiresAt: data.tokenSet?.expires_at,
        claims: data.user // inc. roles + permissions
      })
    }
  }
]
