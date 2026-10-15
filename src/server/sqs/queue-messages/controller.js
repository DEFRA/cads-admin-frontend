export const sqsQueueMessagesController = {
  async handler(_request, h) {
    return h.view('sqs/queue-messages/index', {
      pageTitle: 'SQS Queue Messages',
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
          href: '/dashboard/monitoring/sqs'
        },
        {
          text: 'Messages'
        }
      ],
      viewModel: {}
    })
  }
}
