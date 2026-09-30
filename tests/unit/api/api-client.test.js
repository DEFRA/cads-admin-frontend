import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApiClient } from '../../../src/server/common/clients/api-client.js'
import { getConfig } from '../../../src/config/config.js'
import { getSession } from '../../../src/auth/session-store.js'
import { getTracingHeaderName } from '../../../src/server/common/helpers/request-tracing.js'

// --- Mocks ---
vi.mock('../../../src/config/config.js', () => ({
  getConfig: vi.fn()
}))

vi.mock('../../../src/auth/session-store.js', () => ({
  getSession: vi.fn()
}))

vi.mock('@defra/hapi-tracing', () => ({
  withTraceId: vi.fn((headerName, headers) => ({
    ...headers,
    [headerName]: 'trace-123'
  }))
}))

vi.mock('../../../src/server/common/helpers/request-tracing.js', () => ({
  getTracingHeaderName: vi.fn()
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('api-client', () => {
  let request
  let api

  beforeEach(() => {
    request = {
      state: {},
      headers: {},
      info: { id: 'trace-123' }
    }

    getConfig.mockReturnValue({
      get: vi.fn((key) => {
        const map = {
          cadsCdsBackendUrl: 'https://backend.example.com/'
        }
        return map[key]
      })
    })

    getTracingHeaderName.mockReturnValue('x-trace-id')

    api = createApiClient(request, getConfig().get('cadsCdsBackendUrl'))

    fetch.mockReset()
    getSession.mockReset()
  })

  it('performs GET with correct URL and no token', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
      headers: new Headers()
    })

    const res = await api.get('/endpoint')

    expect(fetch).toHaveBeenCalledWith(
      'https://backend.example.com/endpoint',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-trace-id': expect.any(String)
        })
      })
    )

    expect(res).toEqual({ ok: true })
  })

  it('injects bearer token when session exists', async () => {
    request.state.sid = { sessionId: 'abc' }
    getSession.mockResolvedValue({
      tokenSet: { access_token: 'TOKEN123' }
    })

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
      headers: new Headers()
    })

    await api.get('/secure')

    const call = fetch.mock.calls[0][1]
    expect(call.headers.Authorization).toBe('Bearer TOKEN123')
  })

  it('POST sends JSON body', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ created: true }),
      headers: new Headers()
    })

    await api.post('/items', { name: 'Mark' })

    const call = fetch.mock.calls[0][1]
    expect(call.method).toBe('POST')
    expect(call.body).toBe(JSON.stringify({ name: 'Mark' }))
  })

  it('throws Boom error on non-OK response (non-JSON)', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      headers: new Headers({ 'content-type': 'text/plain' })
    })

    await expect(api.get('/fail')).rejects.toMatchObject({
      output: { statusCode: 500 }
    })
  })

  it('throws Boom error with JSON payload when backend returns JSON error', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'Invalid input' })
    })

    try {
      await api.get('/fail')
    } catch (err) {
      expect(err.output.statusCode).toBe(400)
      expect(err.output.payload).toEqual({ message: 'Invalid input' })
    }
  })
})
