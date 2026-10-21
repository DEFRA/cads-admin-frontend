import { listQueues } from '../common/clients/requests/sqs-admin.js'
import Boom from '@hapi/boom'

export const sqsMonitoringDashboardController = {
  async handler(_request, h) {
    let queuesByService
    try {
      queuesByService = await listQueues(_request)
    } catch (error) {
      _request.logger.error(
        'Failed to fetch SQS queues. Please try again later.'
      )
      _request.logger.error(error)
      _request.logger.error(error.message)
      return Boom.badRequest(
        'Failed to fetch SQS queues. Please try again later.'
      )
    }

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
      viewModel: {
        queuesByService
      }
    })
  }
}
