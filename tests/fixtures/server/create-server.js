import Hapi from '@hapi/hapi'
import Cookie from '@hapi/cookie'

export async function createTestServer(routes) {
  const server = Hapi.server({
    port: 0,
    debug: false
  })

  await server.register(Cookie)

  server.auth.strategy('session', 'cookie', {
    cookie: {
      name: 'sid',
      password: 'a'.repeat(32),
      isSecure: false
    },
    redirectTo: false,
    validate: () => ({
      valid: true,
      credentials: {},
      artifacts: {}
    })
  })

  server.auth.default('session')

  server.route(routes)

  await server.initialize()
  return server
}
