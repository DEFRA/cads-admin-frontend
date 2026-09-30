export const s3MonitoringDashboardController = {
  async handler(request, h) {
    return h.view('s3-monitoring/index', {
      pageTitle: 'S3 Monitoring',
      heading: 'S3 folder and file monitoring',
      breadcrumbs: [
        {
          text: 'Dashboard',
          href: '/dashboard'
        },
        {
          text: 'S3 Monitoring'
        }
      ],
      viewModel: {
      }
    })
  }
}
