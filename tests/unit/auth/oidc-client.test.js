import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClientInstance = { client: true }
const mockClientConstructor = vi.fn(function () {
  return mockClientInstance
})
const mockIssuer = { Client: mockClientConstructor }
const mockDiscover = vi.fn(async () => mockIssuer)

vi.mock('../../../src/auth/config/auth-config.js', () => ({
  getAuthConfig: vi.fn(() => ({
    oidcWellKnownUrl: 'https://issuer.example/.well-known/openid-configuration',
    clientId: 'client12345',
    clientSecret: 'secret12345',
    redirectPath: '/auth/callback',
    allowedRedirectOrigins: ['http://localhost']
  }))
}))

vi.mock('openid-client', () => ({
  Issuer: {
    discover: mockDiscover
  }
}))

describe('getOidcClient', () => {
  beforeEach(() => {
    mockDiscover.mockClear()
    mockClientConstructor.mockClear()
    vi.resetModules()
  })

  it('discovers issuer and constructs client on first call', async () => {
    const { getOidcClient } = await import('../../../src/auth/oidc-client.js')

    const client = await getOidcClient()

    expect(mockDiscover).toHaveBeenCalledTimes(1)
    expect(mockClientConstructor).toHaveBeenCalledWith({
      client_id: 'client12345',
      client_secret: 'secret12345',
      redirect_uris: ['http://localhost/auth/callback'],
      response_types: ['code']
    })
    expect(client).toBe(mockClientInstance)
  })

  it('returns cached client on subsequent calls', async () => {
    const { getOidcClient } = await import('../../../src/auth/oidc-client.js')

    const client1 = await getOidcClient()
    const client2 = await getOidcClient()

    expect(client1).toBe(client2)
    expect(mockDiscover).toHaveBeenCalledTimes(1)
    expect(mockClientConstructor).toHaveBeenCalledTimes(1)
  })
})
