import { sqsMonitoringDashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'

export const sqsMonitoringDashboard = {
  plugin: {
    name: 'sqs-monitoring',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/sqs-monitoring',
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
