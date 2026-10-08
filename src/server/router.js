import inert from '@hapi/inert'

import { home } from './home/index.js'
import { health } from './health/index.js'
import { dashboard } from './dashboard/index.js'
import { dbMonitoringDashboard } from './db-monitoring/index.js'
import { s3MonitoringDashboard } from './s3-monitoring/index.js'
import { sqsMonitoringDashboard } from './sqs-monitoring/index.js'
import { unauthorised } from './unauthorised/index.js'

import { getStaticFilesToServe } from './common/helpers/serve-static-files.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([
        home,
        dashboard,
        dbMonitoringDashboard,
        s3MonitoringDashboard,
        sqsMonitoringDashboard,
        unauthorised
      ])

      // Static assets
      await server.register([getStaticFilesToServe()])
    }
  }
}
