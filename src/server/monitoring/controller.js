import { hasScope } from '../../auth/helpers/extract-scopes.js'
import { resourceScopes } from '../../auth/constants/resource-scopes.js'

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
        canViewS3: hasScope(request, resourceScopes.cadsCds.adminS3Manager)
      }
    })
  }
}
