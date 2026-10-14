export const sqsQueueMessagesController = {
  async handler(request, h) {
    return h.view('./index', {
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
          text: 'SQS',
          href: '/dashboard/monitoring'
        },
        {
          text: 'Messages'
        }
      ],
      viewModel: {}
    })
  }
}
