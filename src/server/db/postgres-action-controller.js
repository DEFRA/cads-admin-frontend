import Boom from '@hapi/boom'

import { executeDbAdminCommand } from '../common/clients/requests/db-admin-execute-command.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  findPostgresAction,
  parsePid,
  pidErrorMessage
} from './helpers/postgres-actions.js'
import { findPostgresMetric } from './helpers/postgres-metrics.js'
import { renderPostgresPerformance } from './postgres-performance-controller.js'
import { renderPostgresDetail } from './postgres-detail-controller.js'
import { postgresDetailPath, postgresPerformancePath } from './paths.js'

function outcomeForError(error) {
  switch (error?.output?.statusCode) {
    case statusCodes.unauthorized:
    case statusCodes.forbidden:
      return 'forbidden'
    case statusCodes.badRequest:
      return 'bad-request'
    default:
      return 'unavailable'
  }
}

/**
 * Only a detailed view that offers the PID actions can be returned to, so
 * the redirect can never leave this page.
 *
 * @param {unknown} returnTo
 */
function returnCommandFor(returnTo) {
  const metric = findPostgresMetric(returnTo)
  return metric?.pidKey ? metric.command : null
}

/**
 * Shows the page the form was on again, with the PID validation error.
 */
function renderPidError(request, h, action, returnCommand) {
  const { pid } = request.payload ?? {}
  const actionError = {
    actionId: action.id,
    text: pidErrorMessage,
    value: typeof pid === 'string' ? pid : ''
  }
  return returnCommand
    ? renderPostgresDetail(request, h, returnCommand, { actionError })
    : renderPostgresPerformance(request, h, { actionError })
}

/**
 * @returns {Promise<string>} the outcome shown in the banner
 */
async function runAction(request, action, pid) {
  try {
    const response = await executeDbAdminCommand(
      request,
      action.command,
      action.requiresPid ? { pid } : undefined
    )
    return response?.result === true ? 'success' : 'not-found'
  } catch (error) {
    request.logger?.warn(
      { action: action.command, statusCode: error?.output?.statusCode },
      'Postgres admin action failed'
    )
    return outcomeForError(error)
  }
}

function redirectPathFor(action, outcome, pid, returnCommand) {
  const query = new URLSearchParams({
    action: action.id,
    outcome,
    ...(pid === null ? {} : { pid: String(pid) })
  })
  const returnPath = returnCommand
    ? postgresDetailPath(returnCommand)
    : postgresPerformancePath

  return `${returnPath}?${query}`
}

/**
 * Runs a cancel, terminate or reset action, then redirects back to the page
 * the form was on (Post/Redirect/Get) with the outcome in the query string.
 */
export const postgresActionController = {
  async handler(request, h) {
    const action = findPostgresAction(request.params.action)
    if (!action) {
      throw Boom.notFound()
    }

    const payload = request.payload ?? {}
    const returnCommand = returnCommandFor(payload.returnTo)

    const pid = action.requiresPid ? parsePid(payload.pid) : null
    if (action.requiresPid && pid === null) {
      return renderPidError(request, h, action, returnCommand)
    }

    request.logger?.info(
      {
        action: action.command,
        pid,
        user: request.auth?.credentials?.user?.sub
      },
      'Postgres admin action requested'
    )

    const outcome = await runAction(request, action, pid)

    return h.redirect(redirectPathFor(action, outcome, pid, returnCommand))
  }
}
