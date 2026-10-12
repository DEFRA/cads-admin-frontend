import { sqsMonitoringDashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'

export const sqsMonitoringDashboard = {
  plugin: {
    name: 'sqs',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard/monitoring/sqs',
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired]
          },
          ...sqsMonitoringDashboardController
        }
      ])
    }
  }
}
