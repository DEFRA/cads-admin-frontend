import Boom from '@hapi/boom'

import { statusCodes } from '../common/constants/status-codes.js'
import { findPostgresMetric } from './helpers/postgres-metrics.js'
import { postgresActions } from './helpers/postgres-actions.js'
import {
  actionBannerFor,
  actionErrorList,
  buildActionForms,
  buildMetricCard,
  loadMetricResults
} from './helpers/postgres-view-model.js'
import { buildDbMonitoringSubNavigation } from './helpers/sub-navigation.js'
import {
  dbMonitoringPath,
  monitoringPath,
  postgresPerformancePath
} from './paths.js'

const pidActions = postgresActions.filter((action) => action.requiresPid)

/**
 * Read-only detailed view of one command, showing every row. Commands that
 * list backend processes also offer the cancel and terminate actions.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {string} command
 * @param {{ actionError?: { actionId: string, text: string, value: string } }} [options]
 */
export async function renderPostgresDetail(request, h, command, options = {}) {
  const metric = findPostgresMetric(command)
  if (!metric) {
    throw Boom.notFound()
  }

  const { actionError } = options
  const [loaded] = await loadMetricResults(request, [metric])
  const card = buildMetricCard(loaded, { full: true })

  const errorList = [
    ...actionErrorList(actionError),
    ...(loaded.error ? [{ text: card.error }] : [])
  ]

  let statusCode = statusCodes.ok
  if (actionError) {
    statusCode = statusCodes.badRequest
  } else if (loaded.error) {
    statusCode = loaded.error.statusCode
  }

  return h
    .view('db/postgres-detail', {
      pageTitle: errorList.length ? `Error: ${metric.title}` : metric.title,
      heading: metric.title,
      breadcrumbs: [
        { text: 'Dashboard', href: '/dashboard' },
        { text: 'Monitoring', href: monitoringPath },
        { text: 'DB', href: dbMonitoringPath },
        {
          text: 'Postgres Performance Monitoring',
          href: postgresPerformancePath
        },
        { text: metric.title }
      ],
      viewModel: {
        subNavigation: buildDbMonitoringSubNavigation(request),
        backHref: postgresPerformancePath,
        banner: actionError ? null : actionBannerFor(request),
        errorList,
        metric: loaded.error ? null : card,
        actions: metric.pidKey
          ? buildActionForms(pidActions, {
              returnTo: metric.command,
              actionError
            })
          : []
      }
    })
    .code(statusCode)
}

export const postgresDetailController = {
  handler(request, h) {
    return renderPostgresDetail(request, h, request.params.command)
  }
}
