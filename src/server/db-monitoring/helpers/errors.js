import { statusCodes } from '../../common/constants/status-codes.js'

export const ctsImportErrorMessages = {
  forbidden: 'You do not have access to CTS parallel import monitoring',
  badRequest:
    'The CTS parallel import monitoring service could not process the request',
  unavailable:
    'There was a problem contacting the CTS parallel import monitoring service. Try again later.'
}

export function describeCtsImportError(error) {
  switch (error?.output?.statusCode) {
    case statusCodes.unauthorized:
    case statusCodes.forbidden:
      return {
        statusCode: statusCodes.forbidden,
        message: ctsImportErrorMessages.forbidden
      }
    case statusCodes.badRequest:
      return {
        statusCode: statusCodes.badRequest,
        message: ctsImportErrorMessages.badRequest
      }
    default:
      return {
        statusCode: statusCodes.badGateway,
        message: ctsImportErrorMessages.unavailable
      }
  }
}
