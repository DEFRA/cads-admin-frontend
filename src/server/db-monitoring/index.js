import { dbMonitoringDashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'

export const dbMonitoringDashboard = {
  plugin: {
    name: 'db-monitoring',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/db-monitoring',
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired]
          },
          ...dbMonitoringDashboardController
        }
      ])
    }
  }
}
