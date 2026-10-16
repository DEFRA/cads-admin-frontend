import { executeDbAdminCommand } from '../../common/clients/requests/db-admin-execute-command.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { describeDbAdminError, postgresErrorMessages } from './errors.js'
import { buildMetric } from './postgres-metrics.js'
import { describeActionOutcome } from './postgres-actions.js'
import { postgresActionPath, postgresDetailPath } from '../paths.js'

/**
 * Runs the commands for the given metrics in parallel. A failed command does
 * not stop the others from loading.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {{ command: string }[]} metrics
 */
export async function loadMetricResults(request, metrics) {
  const outcomes = await Promise.allSettled(
    metrics.map((metric) => executeDbAdminCommand(request, metric.command))
  )

  return metrics.map((metric, index) => {
    const outcome = outcomes[index]
    if (outcome.status === 'fulfilled') {
      return { metric, result: outcome.value?.result }
    }

    const described = describeDbAdminError(
      outcome.reason,
      postgresErrorMessages
    )
    // Only the command and status are logged, never the response body,
    // because the backend error detail can contain database internals
    request.logger?.warn(
      { command: metric.command, statusCode: described.statusCode },
      'Postgres monitoring command failed'
    )
    return { metric, error: described }
  })
}

function errorText(metric, error) {
  return error.statusCode === statusCodes.badGateway &&
    metric.unavailableMessage
    ? metric.unavailableMessage
    : error.message
}

/**
 * @param {{ metric: object, result?: unknown, error?: { statusCode: number, message: string } }} loaded
 * @param {{ full?: boolean }} [options]
 */
export function buildMetricCard({ metric, result, error }, options = {}) {
  const card = {
    id: `metric-${metric.command.replaceAll('_', '-')}`,
    command: metric.command,
    title: metric.title,
    description: metric.description,
    section: metric.section,
    width: metric.width,
    summaryLabel: metric.summaryLabel ?? null,
    detailHref: options.full ? null : postgresDetailPath(metric.command)
  }

  if (error) {
    return { ...card, error: errorText(metric, error) }
  }

  const built = buildMetric(metric, result, options)
  return {
    ...card,
    ...built,
    summaryValue: metric.summaryLabel ? built.totalRows : null
  }
}

/**
 * The status code and error summary for a page whose commands all failed.
 *
 * @param {{ error?: { statusCode: number, message: string } }[]} loaded
 */
export function pageErrorFor(loaded) {
  const failed = loaded.filter((item) => item.error)
  if (!loaded.length || failed.length < loaded.length) {
    return null
  }
  return failed[0].error
}

/**
 * The action forms, with any validation error for the form just submitted.
 *
 * @param {typeof import('./postgres-actions.js').postgresActions} actions
 * @param {{ returnTo?: string, actionError?: { actionId: string, text: string, value: string } }} [options]
 */
export function buildActionForms(actions, { returnTo, actionError } = {}) {
  return actions.map((action) => {
    const hasError = actionError?.actionId === action.id
    return {
      id: action.id,
      title: action.title,
      description: action.description,
      warningText: action.warningText,
      buttonText: action.buttonText,
      buttonClasses: action.buttonClasses,
      requiresPid: action.requiresPid,
      formAction: postgresActionPath(action.id),
      returnTo,
      value: hasError ? actionError.value : '',
      error: hasError ? actionError.text : null
    }
  })
}

/**
 * A form validation error takes precedence over a failed command.
 *
 * @param {{ actionId: string } | undefined} actionError
 * @param {{ statusCode: number } | null | undefined} error
 */
export function statusCodeFor(actionError, error) {
  if (actionError) {
    return statusCodes.badRequest
  }
  return error ? error.statusCode : statusCodes.ok
}

export function actionErrorList(actionError) {
  return actionError
    ? [{ text: actionError.text, href: `#${actionError.actionId}-pid` }]
    : []
}

export function actionBannerFor(request) {
  return describeActionOutcome(request.query)
}
