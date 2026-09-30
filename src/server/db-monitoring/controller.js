export const dbMonitoringDashboardController = {
  async handler(request, h) {
    return h.view('db-monitoring/index', {
      pageTitle: 'DB Monitoring',
      heading: 'Database performance and import monitoring',
      breadcrumbs: [
        {
          text: 'Dashboard',
          href: '/dashboard'
        },
        {
          text: 'DB Monitoring'
        }
      ],
      viewModel: {
      }
    })
  }
}
