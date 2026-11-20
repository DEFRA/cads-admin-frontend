import { statusCodes } from '../../common/constants/status-codes.js'

export const ctsImportErrorMessages = {
  forbidden: 'You do not have access to CTS parallel import monitoring',
  badRequest:
    'The CTS parallel import monitoring service could not process the request',
  unavailable:
    'There was a problem contacting the CTS parallel import monitoring service. Try again later.',
  commandFailed: 'The database could not run this CTS parallel import command'
}

export const postgresErrorMessages = {
  forbidden: 'You do not have access to Postgres performance monitoring',
  badRequest: 'The database monitoring service could not process the request',
  unavailable:
    'There was a problem contacting the database monitoring service. Try again later.',
  commandFailed: 'The database could not run this check'
}

/**
 * Maps a db admin API error to the status code to respond with and a message
 * that is safe to show. The backend's error detail is only passed through for
 * 422, which cads-data-service returns only for messages our own SQL functions
 * raise on purpose, so no database internals are shown.
 *
 * @param {unknown} error
 * @param {{ forbidden: string, badRequest: string, unavailable: string, commandFailed: string }} messages
 */
export function describeDbAdminError(error, messages) {
  switch (error?.output?.statusCode) {
    case statusCodes.unauthorized:
    case statusCodes.forbidden:
      return {
        statusCode: statusCodes.forbidden,
        message: messages.forbidden
      }
    case statusCodes.unprocessableEntity:
      return {
        statusCode: statusCodes.unprocessableEntity,
        message: commandFailedMessage(error, messages.commandFailed)
      }
    case statusCodes.badRequest:
      return {
        statusCode: statusCodes.badRequest,
        message: messages.badRequest
      }
    default:
      return {
        statusCode: statusCodes.badGateway,
        message: messages.unavailable
      }
  }
}

function commandFailedMessage(error, prefix) {
  const detail = error.output.payload?.detail
  if (typeof detail !== 'string' || detail === '') {
    return prefix
  }
  // Npgsql prefixes the SQL state, which means nothing to a user
  return `${prefix}: ${detail.replace(/^P0001: /, '')}`
}

export function describeCtsImportError(error) {
  return describeDbAdminError(error, ctsImportErrorMessages)
}
