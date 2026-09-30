import { constants } from 'node:http2'
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest'
import '../../../mocks/server/setup-server-mocks.js'
import { createServer } from '@/server/server.js'

const { HTTP_STATUS_OK } = constants

let server

describe('index route', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
  })

  test('GET / returns index view', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(response.request.response.source.template).toBe('home/index')
  })
})
