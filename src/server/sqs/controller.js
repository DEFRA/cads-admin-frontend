export const sqsMonitoringDashboardController = {
  async handler(_request, h) {
    return h.view('sqs/index', {
      pageTitle: 'SQS Monitoring',
      heading: 'Message queue and DLQ monitoring',
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
          text: 'SQS'
        }
      ],
      viewModel: {}
    })
  }
}
