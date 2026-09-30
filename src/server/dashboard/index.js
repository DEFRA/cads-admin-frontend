import { dashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'

export const dashboard = {
  plugin: {
    name: 'dashboard',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard',
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired]
          },
          ...dashboardController
        }
      ])
    }
  }
}
