import inert from '@hapi/inert'

import { home } from './home/index.js'
import { health } from './health/index.js'
import { dashboard } from './dashboard/index.js'

import { getStaticFilesToServe } from './common/helpers/serve-static-files.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([
        home,
        dashboard
      ])

      // Static assets
      await server.register([getStaticFilesToServe()])
    }
  }
}
