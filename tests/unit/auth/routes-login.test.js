import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestServer } from '../../../tests/fixtures/server/create-server.js'
import { loginRoutes } from '../../../src/auth/routes-login.js'
import { getOidcClient } from '../../../src/auth/oidc-client.js'
import { setSession, getSession } from '../../../src/auth/session-store.js'

vi.mock('../../../src/auth/oidc-client.js', () => ({
  getOidcClient: vi.fn(),
  callbackParams: vi.fn(),
  callback: vi.fn()
}))

vi.mock('../../../src/auth/session-store.js', () => ({
  setSession: vi.fn(),
  getSession: vi.fn(),
  dropSession: vi.fn()
}))

vi.mock('../../../src/auth/config/auth-config.js', () => ({
  getAuthConfig: vi.fn(() => ({
    clientId: 'client12345',
    redirectPath: '/auth/callback',
    scope: 'openid profile email',
    externalAuthorizeEndpoint: 'https://cads-oidc-mock/auth',
    defaultRedirect: '/dashboard'
  }))
}))

describe('GET /login', () => {
  let server

  beforeEach(async () => {
    server = await createTestServer(loginRoutes)
  })

  it('redirects to IdP with state + nonce and stores handshake', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/login',
      headers: { host: 'external.example' }
    })

    expect(res.statusCode).toBe(302)

    const redirectUrl = new URL(res.headers.location)

    // Correct IdP endpoint
    expect(redirectUrl.origin).toBe('https://cads-oidc-mock')

    // Correct OIDC params
    expect(redirectUrl.searchParams.get('client_id')).toBe('client12345')
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe(
      'http://external.example/auth/callback'
    )
    expect(redirectUrl.searchParams.get('scope')).toBe('openid profile email')

    // Extract generated state + nonce
    const state = redirectUrl.searchParams.get('state')
    const nonce = redirectUrl.searchParams.get('nonce')

    expect(state).toBeTruthy()
    expect(nonce).toBeTruthy()

    // Redis handshake stored correctly
    expect(setSession).toHaveBeenCalledWith(
      `oidc:${state}`,
      expect.objectContaining({
        oidcState: state,
        oidcNonce: nonce,
        redirectTo: '/dashboard'
      })
    )

    // Cookie contains temp sessionId
    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/^sid=/)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie.length).toBeGreaterThan(20)
  })

  it('clears cookie when cookieAuth.clear exists', async () => {
    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/login',
      auth: {
        strategy: 'session',
        credentials: {},
        artifacts: {}
      }
    })

    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/^sid=/)
  })

  it('uses request.app.redirectTo when provided', async () => {
    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/login',
      app: { redirectTo: '/custom' }
    })

    const redirectUrl = new URL(res.headers.location)
    const state = redirectUrl.searchParams.get('state')

    expect(setSession).toHaveBeenCalledWith(
      `oidc:${state}`,
      expect.objectContaining({ redirectTo: '/custom' })
    )
  })

  it('redirects with error when IdP returns error', async () => {
    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?error=access_denied'
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/?error=access_denied')
  })

  it('returns 500 when session cookie missing', async () => {
    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=123'
    })

    expect(res.statusCode).toBe(500)
    expect(res.result.message).toBe('An internal server error occurred')
  })

  it('returns 500 when session cookie value for sessionId is missing', async () => {
    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=123',
      auth: {
        strategy: 'session',
        credentials: { sessionId: null }
      }
    })

    expect(res.statusCode).toBe(500)
    expect(res.result.message).toBe('An internal server error occurred')
  })

  it('returns 500 when handshake missing', async () => {
    getSession.mockResolvedValue(null)

    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=123',
      auth: {
        strategy: 'session',
        credentials: { sessionId: 'oidc:STATE' }
      }
    })

    expect(res.statusCode).toBe(500)
    expect(res.result.message).toBe('An internal server error occurred')
  })

  it('returns 500 when handshake value for oidcState is missing', async () => {
    getSession.mockResolvedValue({ oidcState: 'ABC', oidcNonce: 'XYZ' })

    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=123',
      auth: {
        strategy: 'session',
        credentials: { sessionId: 'oidc:STATE' }
      }
    })

    expect(res.statusCode).toBe(500)
    expect(res.result.message).toBe('An internal server error occurred')
  })

  it('redirects to session redirect url when found', async () => {
    getOidcClient.mockResolvedValue({
      callbackParams: vi.fn().mockReturnValue({
        state: 'ABC',
        session_state: 'XYZ'
      }),
      callback: vi.fn().mockResolvedValue({
        claims: () => ({ sub: '12345' })
      })
    })

    getSession.mockResolvedValue({
      oidcState: 'ABC',
      oidcNonce: 'XYZ',
      redirectTo: '/report/holding_summary'
    })

    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=123',
      auth: {
        strategy: 'session',
        credentials: { sessionId: 'oidc:STATE' }
      }
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/report/holding_summary')
  })

  it('redirects to auth config default url when session value missing', async () => {
    getOidcClient.mockResolvedValue({
      callbackParams: vi.fn().mockReturnValue({
        state: 'ABC',
        session_state: 'XYZ'
      }),
      callback: vi.fn().mockResolvedValue({
        claims: () => ({ sub: '12345' })
      })
    })

    getSession.mockResolvedValue({
      oidcState: 'ABC',
      oidcNonce: 'XYZ',
      redirectTo: null
    })

    server = await createTestServer(loginRoutes)

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=123',
      auth: {
        strategy: 'session',
        credentials: { sessionId: 'oidc:STATE' }
      }
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/dashboard')
  })
})
