import { getConfig } from '../../config/config.js'
import { getSession } from '../session-store.js'

export function getSessionAuthStrategy() {
  const config = getConfig()
  const password = config.get('session.cookie.password')
  const isSecure = config.get('isProduction')

  return {
    name: 'session',
    scheme: 'cookie',
    options: {
      cookie: {
        name: 'sid',
        password,
        isSecure,
        isSameSite: 'Lax',
        path: '/'
      },
      redirectTo: false,
      validate: async (request, session) => {
        if (!session?.sessionId) {
          return { isValid: false }
        }

        const data = await getSession(session.sessionId)
        if (!data?.tokenSet) {
          request.cookieAuth?.clear()
          return { isValid: false }
        }

        return {
          isValid: true,
          credentials: {
            sessionId: session.sessionId,
            ...data
          }
        }
      }
    }
  }
}
