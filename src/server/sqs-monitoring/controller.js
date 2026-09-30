export const sqsMonitoringDashboardController = {
  async handler(request, h) {
    return h.view('sqs-monitoring/index', {
      pageTitle: 'SQS Monitoring',
      heading: 'Message queue and DLQ monitoring',
      breadcrumbs: [
        {
          text: 'Dashboard',
          href: '/dashboard'
        },
        {
          text: 'SQS Monitoring'
        }
      ],
      viewModel: {
      }
    })
  }
}
