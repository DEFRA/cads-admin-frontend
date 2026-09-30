import { s3MonitoringDashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'

export const s3MonitoringDashboard = {
  plugin: {
    name: 's3-monitoring',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/s3-monitoring',
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired]
          },
          ...s3MonitoringDashboardController
        }
      ])
    }
  }
}
