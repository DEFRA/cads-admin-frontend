import Boom from '@hapi/boom'

import { s3MonitoringDashboardController } from './controller.js'
import { createExplorerController } from './explorer-controller.js'
import { s3FileViewerController } from './viewer-controller.js'
import { createPageTokenStore } from './helpers/page-tokens.js'
import { renderS3Error } from './helpers/errors.js'
import { authRequired } from '../../auth/auth-required.js'
import { hasScope } from '../../auth/helpers/extract-scopes.js'
import { resourceScopes } from '../../auth/constants/resource-scopes.js'

/**
 * Only users whose CDS token carries admin.s3.manager may use S3 monitoring.
 * The backend enforces the same scope on every storage endpoint.
 */
export function requireS3Access(request, h) {
  if (hasScope(request, resourceScopes.cadsCds.adminS3Manager)) {
    return h.continue
  }

  return renderS3Error(request, h, Boom.forbidden()).takeover()
}

const routeOptions = {
  auth: {
    strategy: 'session',
    mode: 'try'
  },
  pre: [authRequired, requireS3Access]
}

export const s3MonitoringDashboard = {
  plugin: {
    name: 's3-monitoring',
    register(server) {
      const pageTokens = createPageTokenStore(server)

      server.route([
        {
          method: 'GET',
          path: '/s3-monitoring',
          options: routeOptions,
          ...s3MonitoringDashboardController
        },
        {
          method: 'GET',
          path: '/s3-monitoring/buckets/{clientName}',
          options: routeOptions,
          ...createExplorerController({ pageTokens })
        },
        {
          method: 'GET',
          path: '/s3-monitoring/buckets/{clientName}/object',
          options: routeOptions,
          ...s3FileViewerController
        }
      ])
    }
  }
}
