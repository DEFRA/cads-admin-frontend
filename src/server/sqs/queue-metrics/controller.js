import { getQueueMetrics } from '../../common/clients/requests/sqs-admin.js'
import Boom from '@hapi/boom'

export const sqsQueueMetricsController = {
  async handler(request, h) {
    const { client, queueName } = request.params

    let queueMetricsData, dlqMetricsData
    try {
      ;[queueMetricsData, dlqMetricsData] = await getQueueMetrics(
        request,
        client,
        queueName
      )
    } catch (error) {
      return Boom.badRequest(
        'Failed to fetch SQS queue metrics. Please try again later.'
      )
    }

    return h.view('sqs/queue-metrics/index', {
      pageTitle: 'SQS Metrics',
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
