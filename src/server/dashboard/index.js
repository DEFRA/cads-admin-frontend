import { dashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'
//import { requireRole } from '../../auth/require-role.js'
//import { roleTypes } from '../../auth/constants/roles.js'

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
            pre: [
              authRequired /*,
              requireRole(roleTypes.cadsAdminSuperuser)*/
            ]
          },
          ...dashboardController
        }
      ])
    }
  }
}
