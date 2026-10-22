import { hasScope } from '../../auth/helpers/extract-scopes.js'
import { resourceScopes } from '../../auth/constants/resource-scopes.js'
import { canViewDbMonitoring } from '../db/helpers/db-monitoring-access.js'

export const monitoringController = {
  async handler(request, h) {
    return h.view('monitoring/index', {
      pageTitle: 'Monitoring Dashboard',
      heading: 'Monitoring Dashboard',
      breadcrumbs: [
        { text: 'Dashboard', href: '/dashboard' },
        { text: 'Monitoring' }
      ],
      viewModel: {
        canViewDbMonitoring: canViewDbMonitoring(request),
        canViewS3: hasScope(request, resourceScopes.cadsCds.adminS3Manager)
      }
    })
  }
}
