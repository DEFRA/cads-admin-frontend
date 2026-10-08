import Boom from '@hapi/boom'

import { ctsImportErrorMessages, describeCtsImportError } from './errors.js'

describe('#describeCtsImportError', () => {
  test.each([Boom.unauthorized(), Boom.forbidden()])(
    'Should treat %s as no access',
    (error) => {
      expect(describeCtsImportError(error)).toEqual({
        statusCode: 403,
        message: ctsImportErrorMessages.forbidden
      })
    }
  )

  test('Should report a bad request', () => {
    expect(describeCtsImportError(Boom.badRequest())).toEqual({
      statusCode: 400,
      message: ctsImportErrorMessages.badRequest
    })
  })

  test.each([Boom.internal(), new Error('fetch failed')])(
    'Should treat %s as the service being unavailable',
    (error) => {
      expect(describeCtsImportError(error)).toEqual({
        statusCode: 502,
        message: ctsImportErrorMessages.unavailable
      })
    }
  )
})
