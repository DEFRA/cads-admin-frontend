import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

describe('#unauthorised', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should show the Unauthorised page', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/unauthorised'
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
    expect(response.result).toEqual(expect.stringContaining('Unauthorised |'))
    expect(response.result).toEqual(
      expect.stringContaining(
        'Sorry, you do not have permission to view this page'
      )
    )
  })
})
