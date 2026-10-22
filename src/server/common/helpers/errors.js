import { statusCodes } from '../constants/status-codes.js'

function statusCodeDetails(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return [
        'Page not found',
        'The page you are looking for has not been found',
        'If you think there should be a page here, contact your administrator.'
      ]
    case statusCodes.forbidden:
      return [
        'Forbidden',
        'Sorry, you do not have permission to view this page',
        'If you think you should have access, contact your administrator.'
      ]
    case statusCodes.unauthorized:
      return [
        'Unauthorized',
        'Sorry, you do not have permission to view this page',
        'If you think you should have access, contact your administrator.'
      ]
    case statusCodes.badRequest:
      return [
        'Bad request',
        'The request you made is invalid',
        'If you think this is an error, contact your administrator.'
      ]
    default:
      return [
        'Something went wrong',
        'Sorry, there has been an unexpected error',
        'Please try again later or contact your administrator.'
      ]
  }
}

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const [errorTitle, errorHeading, errorMessage] = statusCodeDetails(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('error/index', {
      pageTitle: errorTitle,
      heading: errorHeading,
      message: errorMessage
    })
    .code(statusCode)
}

/**
 * Walks the nested `cause` chain of an error and returns a flat array of
 * `{ name, code, message, errno }` entries, outermost first. undici wraps the
 * real socket/DNS/TLS failure several levels deep (e.g.
 * "fetch failed" -> "Request was cancelled." -> ECONNREFUSED), so inspecting
 * only `error.cause` hides the root cause.
 * @param {unknown} error
 * @returns {Array<{name?: string, code?: string, message?: string, errno?: number}>}
 */
export function collectCauseChain(error) {
  const chain = []
  let current = error
  let depth = 0

  while (current && depth < 10) {
    chain.push({
      name: current.name,
      code: current.code,
      message: current.message,
      errno: current.errno
    })
    current = current.cause
    depth += 1
  }

  return chain
}
