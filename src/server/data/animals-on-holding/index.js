import { animalsOnHoldingController } from './animalsOnHoldingController.js'
import { authRequired } from '../../../auth/auth-required.js'

export const animalsOnHoldingDashboard = {
  plugin: {
    name: 'animals-on-holding',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard/data/animals-on-holding',
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired]
          },
          handler: animalsOnHoldingController.list
        },
        {
          method: 'GET',
          path: '/dashboard/data/animals-on-holding/{identifier}',
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired]
          },
          handler: animalsOnHoldingController.details
        }
      ])
    }
  }
}
