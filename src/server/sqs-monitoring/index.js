import { sqsMonitoringDashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'
import { requireRole } from '../../auth/require-role.js'
import { roleTypes } from '../../auth/constants/roles.js'

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
            pre: [
              authRequired/*,
              requireRole(roleTypes.cadsAdminSuperuser)*/
            ]
          },
          ...sqsMonitoringDashboardController
        }
      ])
    }
  }
}
