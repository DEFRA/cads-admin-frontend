import { s3MonitoringDashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'
//import { requireRole } from '../../auth/require-role.js'
//import { roleTypes } from '../../auth/constants/roles.js'

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
            pre: [
              authRequired /*,
              requireRole(roleTypes.cadsAdminSuperuser)*/
            ]
          },
          ...s3MonitoringDashboardController
        }
      ])
    }
  }
}
