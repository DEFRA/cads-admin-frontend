import { ctsImportController } from './cts-import-controller.js'
import { postgresPerformanceController } from './postgres-performance-controller.js'
import { postgresDetailController } from './postgres-detail-controller.js'
import { postgresActionController } from './postgres-action-controller.js'
import { requireDbMonitoringAccess } from './helpers/db-monitoring-access.js'
import { authRequired } from '../../auth/auth-required.js'
import {
  ctsImportPath,
  dbMonitoringPath,
  postgresPerformancePath
} from './paths.js'

// Every DB Monitoring page needs the cads-admin-superuser role and the
// admin.db.execute scope
const routeOptions = {
  auth: {
    strategy: 'session',
    mode: 'try'
  },
  pre: [authRequired, requireDbMonitoringAccess]
}

export const dbMonitoringDashboard = {
  plugin: {
    name: 'db',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: dbMonitoringPath,
          options: routeOptions,
          handler: (_request, h) => h.redirect(postgresPerformancePath)
        },
        {
          method: 'GET',
          path: postgresPerformancePath,
          options: routeOptions,
          ...postgresPerformanceController
        },
        {
          method: 'GET',
          path: `${postgresPerformancePath}/{command}`,
          options: routeOptions,
          ...postgresDetailController
        },
        {
          method: 'POST',
          path: `${postgresPerformancePath}/actions/{action}`,
          options: routeOptions,
          ...postgresActionController
        },
        {
          method: 'GET',
          path: ctsImportPath,
          options: routeOptions,
          ...ctsImportController
        }
      ])
    }
  }
}
