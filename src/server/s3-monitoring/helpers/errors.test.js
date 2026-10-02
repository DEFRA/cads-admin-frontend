import Boom from '@hapi/boom'

import { describeS3Error, s3ErrorMessages, S3NotFoundError } from './errors.js'

describe('#describeS3Error', () => {
  test('Should use the page meaning of a backend 404', () => {
    expect(
      describeS3Error(Boom.notFound(), s3ErrorMessages.objectNotFound)
    ).toEqual({ statusCode: 404, message: 'Object not found' })
  })

  test('Should keep the message of a raised not found error', () => {
    expect(
      describeS3Error(
        new S3NotFoundError(s3ErrorMessages.bucketNotFound),
        s3ErrorMessages.objectNotFound
      )
    ).toEqual({ statusCode: 404, message: 'Bucket not found' })
  })

  test.each([Boom.unauthorized(), Boom.forbidden()])(
    'Should treat %s as no access',
    (error) => {
      expect(describeS3Error(error)).toEqual({
        statusCode: 403,
        message: 'You do not have access to this resource'
      })
    }
  )

  test('Should report a rejected request', () => {
    expect(describeS3Error(Boom.badRequest())).toEqual({
      statusCode: 400,
      message: s3ErrorMessages.badRequest
    })
  })

  test.each([Boom.badImplementation(), new TypeError('fetch failed')])(
    'Should treat %s as the service being unavailable',
    (error) => {
      expect(describeS3Error(error)).toEqual({
        statusCode: 502,
        message: s3ErrorMessages.unavailable
      })
    }
  )
})
