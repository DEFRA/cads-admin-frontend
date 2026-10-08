const devCookiePassword = 'the-password-must-be-at-least-32-characters-long'

export function buildSessionSchema({ isProduction }) {
  const fourHoursMs = 14400000

  return {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: isProduction ? 'redis' : 'memory',
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'server side session cache name',
        format: String,
        default: 'session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_CACHE_TTL'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'session cookie password (at least 32 characters, required in production)',
        format: cookiePasswordFormat(isProduction),
        default: isProduction ? '' : devCookiePassword,
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: isProduction,
        env: 'SESSION_COOKIE_SECURE'
      }
    }
  }
}

function cookiePasswordFormat(isProduction) {
  return (value) => {
    if (!isProduction) {
      return
    }
    if (typeof value !== 'string' || value.length < 32) {
      throw new Error(
        'SESSION_COOKIE_PASSWORD must be set to a secret of at least 32 characters in production'
      )
    }
    if (value === devCookiePassword) {
      throw new Error(
        'SESSION_COOKIE_PASSWORD must not use the development default in production'
      )
    }
  }
}
