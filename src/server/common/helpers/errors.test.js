import Boom from '@hapi/boom'

import { catchAll } from './errors.js'
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
