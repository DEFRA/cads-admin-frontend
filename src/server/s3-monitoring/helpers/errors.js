import { statusCodes } from '../../common/constants/status-codes.js'

export const s3ErrorMessages = {
  bucketNotFound: 'Bucket not found',
  objectNotFound: 'Object not found',
  forbidden: 'You do not have access to this resource',
  badRequest: 'The S3 monitoring service could not process the request',
  unavailable:
    'There was a problem contacting the S3 monitoring service. Try again later.'
}

/**
 * An expected "not found" raised by the controllers, e.g. a bucket missing
 * from the bucket list or a key missing from its listing.
 */
export class S3NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.output = { statusCode: statusCodes.notFound }
  }
}

/**
 * Maps a backend API failure to the message and status shown to the user.
 * Boom errors from the API client carry the backend status code; anything
 * else (network failure, timeout) is treated as the service being unavailable.
 *
 * @param {any} error
 * @param {string} notFoundMessage - what a 404 means on this page
 */
export function describeS3Error(error, notFoundMessage) {
  const statusCode = error?.output?.statusCode

  switch (statusCode) {
    case statusCodes.notFound:
      return {
        statusCode,
        message:
          error instanceof S3NotFoundError ? error.message : notFoundMessage
      }
    case statusCodes.unauthorized:
    case statusCodes.forbidden:
      return {
        statusCode: statusCodes.forbidden,
        message: s3ErrorMessages.forbidden
      }
    case statusCodes.badRequest:
      return { statusCode, message: s3ErrorMessages.badRequest }
    default:
      return {
        statusCode: statusCodes.badGateway,
        message: s3ErrorMessages.unavailable
      }
  }
}

/**
 * Renders the S3 error page: a GOV.UK error summary banner with the mapped
 * message, keeping the page's breadcrumbs so the user can navigate back.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {any} error
 * @param {{ notFoundMessage?: string, breadcrumbs?: object[] }} [options]
 */
export function renderS3Error(request, h, error, options = {}) {
  const { notFoundMessage = s3ErrorMessages.bucketNotFound, breadcrumbs } =
    options
  const { statusCode, message } = describeS3Error(error, notFoundMessage)

  if (statusCode === statusCodes.badGateway) {
    request.logger?.error(error, 'S3 monitoring API request failed')
  }

  return h
    .view('s3-monitoring/error', {
      pageTitle: `Error: ${message}`,
      heading: 'S3 Monitoring',
      message,
      breadcrumbs: breadcrumbs ?? [
        { text: 'Dashboard', href: '/dashboard' },
        { text: 'S3 Monitoring', href: '/s3-monitoring' },
        { text: message }
      ]
    })
    .code(statusCode)
}
