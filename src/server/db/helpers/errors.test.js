import Boom from '@hapi/boom'

import {
  ctsImportErrorMessages,
  describeCtsImportError,
  describeDbAdminError,
  postgresErrorMessages
} from './errors.js'

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

describe('#describeDbAdminError', () => {
  test.each([
    [Boom.forbidden(), 403, postgresErrorMessages.forbidden],
    [Boom.badRequest(), 400, postgresErrorMessages.badRequest],
    [Boom.gatewayTimeout(), 502, postgresErrorMessages.unavailable]
  ])('Should map %s with the given messages', (error, statusCode, message) => {
    expect(describeDbAdminError(error, postgresErrorMessages)).toEqual({
      statusCode,
      message
    })
  })

  test('Should never pass the backend error detail through', () => {
    const error = Boom.boomify(new Error('Backend error: 500'), {
      statusCode: 500
    })
    error.output.payload = {
      title: 'An error occurred',
      detail: 'relation "cads.secret_table" does not exist'
    }

    expect(
      JSON.stringify(describeDbAdminError(error, postgresErrorMessages))
    ).not.toContain('secret_table')
  })
})
