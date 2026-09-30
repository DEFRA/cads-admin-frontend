import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock TokenSet so we can control expired() behaviour
const mockExpired = vi.fn()
class MockTokenSet {
  constructor(data) {
    Object.assign(this, data)
  }
  expired() {
    return mockExpired()
  }
}

vi.mock('openid-client', () => ({
  TokenSet: MockTokenSet
}))

// Mock session-store
const mockGetSession = vi.fn()
const mockSetSession = vi.fn()
const mockDropSession = vi.fn()

vi.mock('../../../src/auth/session-store.js', () => ({
  getSession: mockGetSession,
  setSession: mockSetSession,
  dropSession: mockDropSession
}))

// Mock OIDC client
const mockRefresh = vi.fn()
const mockOidcClient = { refresh: mockRefresh }

vi.mock('../../../src/auth/oidc-client.js', () => ({
  getOidcClient: vi.fn(() => mockOidcClient)
}))

// Mock roles + permissions
vi.mock('../../../src/auth/constants/roles.js', () => ({
  roleTypes: { miAdmin: 'MI_ADMIN' }
}))

// Import module under test AFTER mocks
let sessionMiddleware
beforeEach(async () => {
  vi.resetModules()
  ;({ sessionMiddleware } = await import(
    '../../../src/auth/session-middleware.js'
  ))

  mockGetSession.mockReset()
  mockSetSession.mockReset()
  mockDropSession.mockReset()
  mockRefresh.mockReset()
  mockExpired.mockReset()
})

function createRequest(overrides = {}) {
  return {
    path: '/protected/route',
    route: { settings: { auth: true } },
    cookieAuth: { clear: vi.fn() },
    auth: { artifacts: { sessionId: '12345' }, credentials: null },
    logger: { error: vi.fn() },
    app: {},
    ...overrides
  }
}

function createH() {
  return {
    continue: 'continue',
    redirect: vi.fn(() => ({
      takeover: vi.fn(() => 'takeover')
    }))
  }
}

describe('sessionMiddleware', () => {
  it('skips static routes', async () => {
    const request = createRequest({ path: '/public/logo.png' })
    const h = createH()

    const result = await sessionMiddleware(request, h)

    expect(result).toBe('continue')
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  it('skips when no session cookie', async () => {
    const request = createRequest({ auth: { artifacts: null } })
    const h = createH()

    const result = await sessionMiddleware(request, h)

    expect(result).toBe('continue')
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  it('skips when Redis session missing', async () => {
    mockGetSession.mockResolvedValue(null)

    const request = createRequest()
    const h = createH()

    const result = await sessionMiddleware(request, h)

    expect(request.cookieAuth.clear).toHaveBeenCalled()
    expect(result).toBe('continue')
  })

  it('attaches credentials when token not expired', async () => {
    mockExpired.mockReturnValue(false)

    mockGetSession.mockResolvedValue({
      tokenSet: { access_token: 'atoken' },
      user: {
        name: 'John Doe',
        roles: ['MI_ADMIN'],
        permissions: []
      }
    })

    const request = createRequest()
    const h = createH()

    const result = await sessionMiddleware(request, h)

    expect(result).toBe('continue')
    expect(request.auth.credentials.user.roles).toEqual(['MI_ADMIN'])
    expect(request.auth.credentials.user.permissions).toEqual([])
  })

  it('refreshes token when expired', async () => {
    mockExpired.mockReturnValue(true)

    mockGetSession.mockResolvedValue({
      tokenSet: { refresh_token: 'rtoken1' },
      user: { name: 'John Doe', roles: ['MI_ADMIN'] },
      userSub: '12345'
    })

    mockRefresh.mockResolvedValue({
      refresh_token: 'rtoken2',
      claims: () => ({ name: 'John Doe', roles: ['MI_ADMIN'] })
    })

    const request = createRequest()
    const h = createH()

    const result = await sessionMiddleware(request, h)

    expect(mockRefresh).toHaveBeenCalledWith('rtoken1')
    expect(mockSetSession).toHaveBeenCalled()
    expect(request.auth.credentials.user.permissions).toEqual([])
    expect(result).toBe('continue')
  })

  it('drops session when refresh fails', async () => {
    mockExpired.mockReturnValue(true)

    mockGetSession.mockResolvedValue({
      tokenSet: { refresh_token: 'rtoken1' },
      user: {},
      userSub: '12345'
    })

    mockRefresh.mockRejectedValue(new Error('refresh failed'))

    const request = createRequest()
    const h = createH()

    const result = await sessionMiddleware(request, h)

    expect(mockDropSession).toHaveBeenCalledWith('12345')
    expect(request.cookieAuth.clear).toHaveBeenCalled()
    expect(result).toBe('continue')
  })
})
