import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuthConfig } from '../../../src/auth/config/auth-config.js'
import { getConfig } from '../../../src/config/config.js'

// Mock getConfig
vi.mock('../../../src/config/config.js', () => ({
  getConfig: vi.fn()
}))

describe('auth-config', () => {
  beforeEach(() => {
    getConfig.mockReturnValue({
      get: vi.fn((key) => {
        const map = {
          'azure.cadsCdsClientId': 'abc123',
          'azure.cadsBridgeClientId': 'abc456',
          'azure.useSimpleScopes': false,
          'oidc.clientId': 'client1',
          'oidc.clientSecret': 'secret1',
          'oidc.redirectPath': '/auth/callback',
          'oidc.postLogoutRedirectPath': '/auth/signed-out',
          'oidc.allowedRedirectOrigins': 'http://localhost:3000',
          'oidc.postLoginDefaultRedirectUri': '/dashboard',
          'oidc.wellKnownUrl': 'http://idp/.well-known',
          'oidc.externalAuthorizeEndpoint': 'http://idp/auth',
          'oidc.externalEndSessionEndpoint': 'http://idp/logout',
          'oidc.enableDebugEndpoints': false
        }
        return map[key]
      })
    })
  })

  it('builds full API scope when useSimpleScopes=false', () => {
    const cfg = getAuthConfig()
    expect(cfg.scope).toContain('api://abc123/admin.db.execute')
    expect(cfg.scope).toContain('api://abc123/admin.s3.manager')
    expect(cfg.scope).toContain('api://abc123/admin.queue.manager')
  })

  it('builds simple scope when useSimpleScopes=true', () => {
    getConfig.mockReturnValue({
      get: vi.fn((key) => {
        const map = {
          'azure.cadsCdsClientId': 'abc123',
          'azure.useSimpleScopes': true
        }
        return map[key]
      })
    })

    const cfg = getAuthConfig()
    expect(cfg.scope).toContain('admin.db.execute')
    expect(cfg.scope).not.toContain('api://')
  })

  it('returns all expected OIDC config fields', () => {
    const cfg = getAuthConfig()

    expect(cfg.clientId).toBe('client1')
    expect(cfg.clientSecret).toBe('secret1')
    expect(cfg.redirectPath).toBe('/auth/callback')
    expect(cfg.postLogoutRedirectPath).toBe('/auth/signed-out')
    expect(cfg.allowedRedirectOrigins).toEqual(['http://localhost:3000'])
    expect(cfg.defaultRedirect).toBe('/dashboard')
    expect(cfg.oidcWellKnownUrl).toBe('http://idp/.well-known')
    expect(cfg.externalAuthorizeEndpoint).toBe('http://idp/auth')
    expect(cfg.externalEndSessionEndpoint).toBe('http://idp/logout')
  })
})
