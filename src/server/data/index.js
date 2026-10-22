import { dataController } from './dataController.js'
import { authRequired } from '../../auth/auth-required.js'

export const dataDashboard = {
  plugin: {
    name: 'data',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard/data',
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired]
          },
          ...dataController
        }
      ])
    }
  }
}
