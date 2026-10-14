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

    let pid = null
    if (action.requiresPid) {
      pid = parsePid(payload.pid)
      if (pid === null) {
        const actionError = {
          actionId: action.id,
          text: pidErrorMessage,
          value: typeof payload.pid === 'string' ? payload.pid : ''
        }
        return returnCommand
          ? renderPostgresDetail(request, h, returnCommand, { actionError })
          : renderPostgresPerformance(request, h, { actionError })
      }
    }

    request.logger?.info(
      {
        action: action.command,
        pid,
        user: request.auth?.credentials?.user?.sub
      },
      'Postgres admin action requested'
    )

    let outcome
    try {
      const response = await executeDbAdminCommand(
        request,
        action.command,
        action.requiresPid ? { pid } : undefined
      )
      outcome = response?.result === true ? 'success' : 'not-found'
    } catch (error) {
      outcome = outcomeForError(error)
      request.logger?.warn(
        { action: action.command, statusCode: error?.output?.statusCode },
        'Postgres admin action failed'
      )
    }

    const query = new URLSearchParams({
      action: action.id,
      outcome,
      ...(pid === null ? {} : { pid: String(pid) })
    })
    const returnPath = returnCommand
      ? postgresDetailPath(returnCommand)
      : postgresPerformancePath

    return h.redirect(`${returnPath}?${query}`)
  }
}
