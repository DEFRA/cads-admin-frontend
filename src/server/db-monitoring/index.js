import { dbMonitoringDashboardController } from './controller.js'
import { ctsImportController, ctsImportPath } from './cts-import-controller.js'
import { requireCtsImportAccess } from './helpers/cts-import-access.js'
import { authRequired } from '../../auth/auth-required.js'
//import { requireRole } from '../../auth/require-role.js'
//import { roleTypes } from '../../auth/constants/roles.js'

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
            pre: [
              authRequired /*,
              requireRole(roleTypes.cadsAdminSuperuser)*/
            ]
          },
          ...dbMonitoringDashboardController
        },
        {
          method: 'GET',
          path: ctsImportPath,
          options: {
            auth: {
              strategy: 'session',
              mode: 'try'
            },
            pre: [authRequired, requireCtsImportAccess]
          },
          ...ctsImportController
        }
      ])
    }
  }
}
