import Boom from '@hapi/boom'

import { catchAll, collectCauseChain } from './errors.js'
import { statusCodes } from '../constants/status-codes.js'

function mockRequest(response, logger) {
  return {
    response,
    logger: logger ?? { error: vi.fn() }
  }
}

function mockToolkit() {
  const h = {
    continue: Symbol('continue'),
    view: vi.fn()
  }
  const viewResponse = { code: vi.fn() }
  h.view.mockReturnValue(viewResponse)
  return { h, viewResponse }
}

describe('#catchAll', () => {
  describe('When response is not a Boom error', () => {
    test('Should return h.continue', () => {
      const { h } = mockToolkit()
      const request = mockRequest({ statusCode: statusCodes.ok })

      const result = catchAll(request, h)

      expect(result).toBe(h.continue)
    })
  })

  describe('When response is a 401 Unauthorized Boom error', () => {
    test('Should render the error view with "Unauthorized"', () => {
      const { h, viewResponse } = mockToolkit()
      const request = mockRequest(Boom.unauthorized())

      catchAll(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Unauthorized',
        heading: 'Sorry, you do not have permission to view this page',
        message:
          'If you think you should have access, contact your administrator.'
      })
      expect(viewResponse.code).toHaveBeenCalledWith(statusCodes.unauthorized)
    })
  })

  describe('When response is a 404 Not Found Boom error', () => {
    test('Should render the error view with "Page not found"', () => {
      const { h, viewResponse } = mockToolkit()
      const request = mockRequest(Boom.notFound())

      catchAll(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Page not found',
        heading: 'The page you are looking for has not been found',
        message:
          'If you think there should be a page here, contact your administrator.'
      })
      expect(viewResponse.code).toHaveBeenCalledWith(statusCodes.notFound)
    })
  })

  describe('When response is a 403 Forbidden Boom error', () => {
    test('Should render the error view with "Forbidden"', () => {
      const { h, viewResponse } = mockToolkit()
      const request = mockRequest(Boom.forbidden())

      catchAll(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Forbidden',
        heading: 'Sorry, you do not have permission to view this page',
        message:
          'If you think you should have access, contact your administrator.'
      })
      expect(viewResponse.code).toHaveBeenCalledWith(statusCodes.forbidden)
    })
  })

  describe('When response is a 400 Bad Request Boom error', () => {
    test('Should render the error view with "Bad request"', () => {
      const { h, viewResponse } = mockToolkit()
      const request = mockRequest(Boom.badRequest())

      catchAll(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Bad request',
        heading: 'The request you made is invalid',
        message: 'If you think this is an error, contact your administrator.'
      })
      expect(viewResponse.code).toHaveBeenCalledWith(statusCodes.badRequest)
    })
  })

  describe('When response is a 500 Internal Server Error Boom error', () => {
    test('Should render the error view with "Something went wrong"', () => {
      const { h, viewResponse } = mockToolkit()
      const boom = Boom.internal('Unexpected failure')
      const logger = { error: vi.fn() }
      const request = mockRequest(boom, logger)

      catchAll(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Something went wrong',
        heading: 'Sorry, there has been an unexpected error',
        message: 'Please try again later or contact your administrator.'
      })
      expect(viewResponse.code).toHaveBeenCalledWith(
        statusCodes.internalServerError
      )
    })

    test('Should log the error stack', () => {
      const { h } = mockToolkit()
      const boom = Boom.internal('Unexpected failure')
      const logger = { error: vi.fn() }
      const request = mockRequest(boom, logger)

      catchAll(request, h)

      expect(logger.error).toHaveBeenCalledWith(boom.stack)
    })
  })

  describe('When response is an unrecognised 4xx Boom error', () => {
    test('Should render the error view with "Something went wrong"', () => {
      const { h, viewResponse } = mockToolkit()
      const request = mockRequest(Boom.teapot())

      catchAll(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Something went wrong',
        heading: 'Sorry, there has been an unexpected error',
        message: 'Please try again later or contact your administrator.'
      })
      expect(viewResponse.code).toHaveBeenCalledWith(statusCodes.imATeapot)
    })
  })
})

describe('#collectCauseChain', () => {
  test('Should return a single entry for an error with no cause', () => {
    const error = new Error('fetch failed')

    const chain = collectCauseChain(error)

    expect(chain).toEqual([
      {
        name: 'Error',
        code: undefined,
        message: 'fetch failed',
        errno: undefined
      }
    ])
  })

  test('Should extract name, code, message and errno from each entry', () => {
    const error = Object.assign(new Error('fetch failed'), {
      name: 'TypeError',
      code: 'UND_ERR',
      errno: -111
    })

    const [entry] = collectCauseChain(error)

    expect(entry).toEqual({
      name: 'TypeError',
      code: 'UND_ERR',
      message: 'fetch failed',
      errno: -111
    })
  })

  test('Should walk the nested cause chain, outermost first', () => {
    const root = Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
      errno: -111
    })
    const middle = Object.assign(new Error('Request was cancelled.'), {
      code: 'UND_ERR_ABORTED',
      cause: root
    })
    const outer = Object.assign(new TypeError('fetch failed'), {
      cause: middle
    })

    const chain = collectCauseChain(outer)

    expect(chain).toEqual([
      {
        name: 'TypeError',
        code: undefined,
        message: 'fetch failed',
        errno: undefined
      },
      {
        name: 'Error',
        code: 'UND_ERR_ABORTED',
        message: 'Request was cancelled.',
        errno: undefined
      },
      {
        name: 'Error',
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
        errno: -111
      }
    ])
  })

  test('Should surface the root cause as the last entry', () => {
    const root = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
      code: 'ENOTFOUND'
    })
    const outer = Object.assign(new TypeError('fetch failed'), { cause: root })

    const chain = collectCauseChain(outer)

    expect(chain[chain.length - 1]).toEqual({
      name: 'Error',
      code: 'ENOTFOUND',
      message: 'getaddrinfo ENOTFOUND',
      errno: undefined
    })
  })

  test('Should handle non-Error causes', () => {
    const outer = Object.assign(new Error('wrapper'), {
      cause: 'a plain string cause'
    })

    const chain = collectCauseChain(outer)

    expect(chain).toHaveLength(2)
    expect(chain[1]).toEqual({
      name: undefined,
      code: undefined,
      message: undefined,
      errno: undefined
    })
  })

  test('Should cap traversal at 10 entries for a cyclic cause chain', () => {
    const error = new Error('loop')
    error.cause = error

    const chain = collectCauseChain(error)

    expect(chain).toHaveLength(10)
  })

  test.each([[null], [undefined]])(
    'Should return an empty array for %s',
    (value) => {
      expect(collectCauseChain(value)).toEqual([])
    }
  )
})
