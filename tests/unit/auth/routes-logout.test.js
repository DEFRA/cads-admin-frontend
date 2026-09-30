import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestServer } from '../../../tests/fixtures/server/create-server.js'

import { logoutRoutes } from '../../../src/auth/routes-logout.js'
import { dropSession } from '../../../src/auth/session-store.js'
import { getAuthConfig } from '../../../src/auth/config/auth-config.js'

// Inline mocks
vi.mock('../../../src/auth/session-store.js', () => ({
  dropSession: vi.fn()
}))

vi.mock('../../../src/auth/config/auth-config.js', () => ({
  getAuthConfig: vi.fn()
}))

describe('GET /logout', () => {
  let server

  beforeEach(async () => {
    getAuthConfig.mockReturnValue({
      externalEndSessionEndpoint: 'https://cads-oidc-mock/logout',
      postLogoutRedirectPath: '/auth/signed-out'
    })

    server = await createTestServer(logoutRoutes)
  })

  it('drops session, clears cookie, and redirects to IdP logout', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/logout',
      headers: { host: 'external.example' },
      auth: {
        strategy: 'session',
        artifacts: { sessionId: 'abc123' },
        credentials: {
          tokenSet: { id_token: 'IDTOKEN' }
        }
      }
    })

    // Redis session dropped
    expect(dropSession).toHaveBeenCalledWith('abc123')

    // Cookie cleared
    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/^sid=/)
    expect(cookie).toContain('HttpOnly')

    // Redirect correct
    expect(res.statusCode).toBe(302)

    const redirectUrl = new URL(res.headers.location)

    expect(redirectUrl.origin).toBe('https://cads-oidc-mock')
    expect(redirectUrl.searchParams.get('id_token_hint')).toBe('IDTOKEN')
    expect(redirectUrl.searchParams.get('post_logout_redirect_uri')).toBe(
      'http://external.example/auth/signed-out'
    )

    // State generated
    expect(redirectUrl.searchParams.get('state')).toBeTruthy()
  })

  it('handles missing session gracefully', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/logout',
      auth: {
        strategy: 'session',
        artifacts: {}, // no sessionId
        credentials: {}
      }
    })

    // No Redis call
    expect(dropSession).not.toHaveBeenCalled()

    // Cookie cleared
    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/^sid=/)

    // Redirect still correct
    expect(res.statusCode).toBe(302)
  })
})

describe('GET /auth/signed-out', () => {
  let server

  beforeEach(async () => {
    server = await createTestServer(logoutRoutes)
  })

  it('redirects to root', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/auth/signed-out'
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/')
  })
})
