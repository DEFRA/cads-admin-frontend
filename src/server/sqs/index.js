import { sqsMonitoringDashboardController } from './controller.js'
import { authRequired } from '../../auth/auth-required.js'
import { hasAnyScope } from '../../auth/helpers/extract-scopes.js'
import { resourceScopes } from '../../auth/constants/resource-scopes.js'
import Boom from '@hapi/boom'
import { sqsQueueMetricsController } from './queue-metrics/controller.js'
import {
  sqsQueueMessagesController,
  sqsReplayDLQMessagesController
} from './queue-messages/controller.js'

export function requireSqsAccess(request, h) {
  if (
    hasAnyScope(request, [
      resourceScopes.cadsCds.adminQueueManager,
      resourceScopes.cadsBridge.adminQueueManager
    ])
  ) {
    return h.continue
  }

  throw Boom.forbidden()
}

const routeOptions = {
  auth: {
    strategy: 'session',
    mode: 'try'
  },
  pre: [authRequired, requireSqsAccess]
}

export const sqsMonitoringDashboard = {
  plugin: {
    name: 'sqs',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard/monitoring/sqs',
          options: routeOptions,
          ...sqsMonitoringDashboardController
        },
        {
          method: 'GET',
          path: '/dashboard/monitoring/sqs/{client}/{queueName}',
          options: routeOptions,
          ...sqsQueueMetricsController
        },
        {
          method: 'GET',
          path: '/dashboard/monitoring/sqs/{client}/{queueName}/{queueType}/messages',
          options: routeOptions,
          ...sqsQueueMessagesController
        },
        {
          method: 'POST',
          path: '/dashboard/monitoring/sqs/{client}/{queueName}/dlq/messages/replay',
          options: routeOptions,
          ...sqsReplayDLQMessagesController
        }
      ])
    }
  }
}
