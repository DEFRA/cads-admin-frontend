import { queueMetrics } from '../../common/clients/requests/sqs-admin.js'

export const sqsQueueMetricsController = {
  async handler(request, h) {
    const { client, queueName } = request.params
    const [queueMetricsData, dlqMetricsData] = await queueMetrics(
      request,
      client,
      queueName
    )
    return h.view('sqs/queue-metrics/index', {
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
          href: '/dashboard/monitoring/sqs'
        },
        {
          text: `${queueName} metrics`
        }
      ],
      viewModel: {
        queueMetrics: queueMetricsData,
        dlqMetrics: dlqMetricsData
      }
    })
  }
}
