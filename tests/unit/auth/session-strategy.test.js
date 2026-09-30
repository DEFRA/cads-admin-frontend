import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSessionAuthStrategy } from '../../../src/auth/plugins/session-strategy.js'
import { getConfig } from '../../../src/config/config.js'
import { getSession } from '../../../src/auth/session-store.js'

// Mocks
vi.mock('../../../src/config/config.js', () => ({
  getConfig: vi.fn()
}))

vi.mock('../../../src/auth/session-store.js', () => ({
  getSession: vi.fn()
}))

describe('getSessionAuthStrategy', () => {
  beforeEach(() => {
    getConfig.mockReturnValue({
      get: vi.fn((key) => {
        const map = {
          'session.cookie.password': 'super-secret',
          isProduction: true
        }
        return map[key]
      })
    })
  })

  it('returns correct cookie strategy config', () => {
    const strategy = getSessionAuthStrategy()

    expect(strategy.name).toBe('session')
    expect(strategy.scheme).toBe('cookie')

    expect(strategy.options.cookie).toEqual({
      name: 'sid',
      password: 'super-secret',
      isSecure: true,
      isSameSite: 'Lax',
      path: '/'
    })
  })

  it('validate returns invalid when no sessionId', async () => {
    const strategy = getSessionAuthStrategy()
    const result = await strategy.options.validate({}, {})

    expect(result).toEqual({ isValid: false })
  })

  it('validate returns invalid when Redis session missing', async () => {
    getSession.mockResolvedValue(null)

    const request = { cookieAuth: { clear: vi.fn() } }
    const strategy = getSessionAuthStrategy()

    const result = await strategy.options.validate(request, {
      sessionId: 'abc'
    })

    expect(request.cookieAuth.clear).toHaveBeenCalled()
    expect(result).toEqual({ isValid: false })
  })

  it('validate returns credentials when session exists', async () => {
    getSession.mockResolvedValue({
      user: 'mark',
      tokenSet: { access_token: 'token' }
    })

    const strategy = getSessionAuthStrategy()
    const result = await strategy.options.validate({}, { sessionId: 'abc' })

    expect(result).toEqual({
      isValid: true,
      credentials: {
        sessionId: 'abc',
        user: 'mark',
        tokenSet: { access_token: 'token' }
      }
    })
  })

  it('validate returns invalid when session has no tokenSet (temp handshake session)', async () => {
    getSession.mockResolvedValue({ oidcState: 'abc', oidcNonce: 'xyz' })

    const strategy = getSessionAuthStrategy()
    const result = await strategy.options.validate(
      {},
      { sessionId: 'oidc:abc' }
    )

    expect(result).toEqual({ isValid: false })
  })
})
