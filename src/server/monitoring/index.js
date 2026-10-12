import { monitoringController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'

export const monitoring = {
  plugin: {
    name: 'monitoring',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard/monitoring',
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired]
          },
          ...monitoringController
        }
      ])
    }
  }
}
