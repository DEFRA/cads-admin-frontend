import { canViewCtsImport } from './helpers/cts-import-access.js'
import { ctsImportPath } from './cts-import-controller.js'

export const dbMonitoringDashboardController = {
  async handler(request, h) {
    return h.view('db/index', {
      pageTitle: 'DB Monitoring',
      heading: 'Database performance and import monitoring',
      breadcrumbs: [
        {
          text: 'Dashboard',
          href: '/dashboard'
        },
        {
          text: 'Monitoring',
          href: '/dashboard/monitoring'
        },
        {
          text: 'DB'
        }
      ],
      viewModel: {
        canViewCtsImport: canViewCtsImport(request),
        ctsImportUrl: ctsImportPath
      }
    })
  }
}
