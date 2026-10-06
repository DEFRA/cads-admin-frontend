import { hasScope } from '../../auth/helpers/extract-scopes.js'
import { resourceScopes } from '../../auth/constants/resource-scopes.js'

export const dashboardController = {
  async handler(request, h) {
    return h.view('dashboard/index', {
      pageTitle: 'Dashboard',
      heading: 'Dashboard',
      breadcrumbs: [],
      viewModel: {
        canViewS3: hasScope(request, resourceScopes.cadsCds.adminS3Manager)
      }
    })
  }
}
