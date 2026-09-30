import { vi } from 'vitest'
import { statusCodes } from '../../../src/server/common/constants/status-codes.js'

// Static errors
export const apiErrors = {
  notFound: {
    statusCode: statusCodes.notFound,
    error: 'Not Found',
    message: 'The requested resource was not found'
  },

  badRequest: {
    statusCode: statusCodes.badRequest,
    error: 'Bad Request',
    message: 'Invalid request payload'
  },

  unauthorized: {
    statusCode: statusCodes.unauthorized,
    error: 'Unauthorized',
    message: 'Authentication required'
  },

  internalError: {
    statusCode: statusCodes.badRequest,
    error: 'Internal Server Error',
    message: 'Something went wrong'
  }
}

// Helpers
export function createApiError(statusCode, message = 'Error') {
  return {
    statusCode,
    error: message,
    message
  }
}

export function mockApiReject(error = apiErrors.internalError) {
  return vi.fn().mockRejectedValue(error)
}

export function mockApiResolve(data) {
  return vi.fn().mockResolvedValue(data)
}

export const networkError = new Error('Network request failed')
networkError.code = 'ECONNREFUSED'

export function mockNetworkFailure() {
  return vi.fn().mockRejectedValue(networkError)
}
