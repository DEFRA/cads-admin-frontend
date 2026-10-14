import { statusCodes } from '../common/constants/status-codes.js'
import {
  buildHeadlineFigures,
  postgresMetrics,
  postgresSections
} from './helpers/postgres-metrics.js'
import { postgresActions } from './helpers/postgres-actions.js'
import {
  actionBannerFor,
  actionErrorList,
  buildActionForms,
  buildMetricCard,
  loadMetricResults,
  pageErrorFor
} from './helpers/postgres-view-model.js'
import { buildDbMonitoringSubNavigation } from './helpers/sub-navigation.js'
import { dbMonitoringPath, monitoringPath } from './paths.js'

const pageTitle = 'Postgres Performance Monitoring'

const breadcrumbs = [
  { text: 'Dashboard', href: '/dashboard' },
  { text: 'Monitoring', href: monitoringPath },
  { text: 'DB', href: dbMonitoringPath },
  { text: pageTitle }
]

/**
 * Renders the summary dashboard. Also used by the action route to show a
 * form validation error.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {{ actionError?: { actionId: string, text: string, value: string } }} [options]
 */
export async function renderPostgresPerformance(request, h, options = {}) {
  const { actionError } = options
  const loaded = await loadMetricResults(request, postgresMetrics)

  const results = Object.fromEntries(
    loaded
      .filter((item) => !item.error)
      .map((item) => [item.metric.command, item.result])
  )

  const cards = loaded.map((item) => buildMetricCard(item))
  const sections = postgresSections.map((section) => ({
    ...section,
    cards: cards.filter((card) => card.section === section.id)
  }))

  const pageError = pageErrorFor(loaded)
  const errorList = [
    ...actionErrorList(actionError),
    ...(pageError ? [{ text: pageError.message }] : [])
  ]

  let statusCode = statusCodes.ok
  if (actionError) {
    statusCode = statusCodes.badRequest
  } else if (pageError) {
    statusCode = pageError.statusCode
  }

  return h
    .view('db/postgres-performance', {
      pageTitle: errorList.length ? `Error: ${pageTitle}` : pageTitle,
      heading: pageTitle,
      breadcrumbs,
      viewModel: {
        subNavigation: buildDbMonitoringSubNavigation(request),
        banner: actionError ? null : actionBannerFor(request),
        errorList,
        headlineFigures: pageError ? [] : buildHeadlineFigures(results),
        sections: pageError ? [] : sections,
        actions: buildActionForms(postgresActions, { actionError })
      }
    })
    .code(statusCode)
}

export const postgresPerformanceController = {
  handler(request, h) {
    return renderPostgresPerformance(request, h)
  }
}
