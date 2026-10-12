import { statusCodes } from '../../common/constants/status-codes.js'

export const ctsImportErrorMessages = {
  forbidden: 'You do not have access to CTS parallel import monitoring',
  badRequest:
    'The CTS parallel import monitoring service could not process the request',
  unavailable:
    'There was a problem contacting the CTS parallel import monitoring service. Try again later.'
}

export const postgresErrorMessages = {
  forbidden: 'You do not have access to Postgres performance monitoring',
  badRequest: 'The database monitoring service could not process the request',
  unavailable:
    'There was a problem contacting the database monitoring service. Try again later.'
}

/**
 * Maps a db admin API error to the status code to respond with and a message
 * that is safe to show. The backend's error detail is never passed through.
 *
 * @param {unknown} error
 * @param {{ forbidden: string, badRequest: string, unavailable: string }} messages
 */
export function describeDbAdminError(error, messages) {
  switch (error?.output?.statusCode) {
    case statusCodes.unauthorized:
    case statusCodes.forbidden:
      return {
        statusCode: statusCodes.forbidden,
        message: messages.forbidden
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

export function describeCtsImportError(error) {
  return describeDbAdminError(error, ctsImportErrorMessages)
}
