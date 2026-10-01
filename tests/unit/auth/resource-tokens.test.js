import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAccessToken } from '../../../src/auth/resource-tokens.js'
import { getSession, setSession } from '../../../src/auth/session-store.js'
import { getOidcClient } from '../../../src/auth/oidc-client.js'

vi.mock('../../../src/auth/session-store.js', () => ({
  getSession: vi.fn(),
  setSession: vi.fn()
}))

vi.mock('../../../src/auth/oidc-client.js', () => ({
  getOidcClient: vi.fn()
}))

vi.mock('../../../src/auth/config/auth-config.js', () => ({
  getAuthConfig: vi.fn(() => ({
    bridgeExchangeScope: 'offline_access api://bridge/scope'
  }))
}))

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600
const anHourAgo = () => Math.floor(Date.now() / 1000) - 3600

describe('getAccessToken', () => {
  let refresh

  beforeEach(() => {
    vi.resetAllMocks()
    refresh = vi.fn()
    getOidcClient.mockResolvedValue({ refresh })
  })

  it('returns null when there is no session', async () => {
    getSession.mockResolvedValue(null)
    expect(await getAccessToken('sid')).toBeNull()
  })

  it('returns the sign-in access token for cds', async () => {
    getSession.mockResolvedValue({ tokenSet: { access_token: 'cds-token' } })
    expect(await getAccessToken('sid', 'cds')).toBe('cds-token')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('returns a cached bridge token while it is valid', async () => {
    getSession.mockResolvedValue({
      tokenSet: { access_token: 'cds-token', refresh_token: 'r1' },
      resourceTokens: {
        bridge: { access_token: 'bridge-cached', expires_at: inOneHour() }
      }
    })

    expect(await getAccessToken('sid', 'bridge')).toBe('bridge-cached')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('fetches a bridge token with the refresh token and stores it', async () => {
    getSession.mockResolvedValue({
      tokenSet: { access_token: 'cds-token', refresh_token: 'r1' }
    })
    refresh.mockResolvedValue({
      access_token: 'bridge-new',
      refresh_token: 'r2',
      expires_at: inOneHour()
    })

    expect(await getAccessToken('sid', 'bridge')).toBe('bridge-new')
    expect(refresh).toHaveBeenCalledWith('r1', {
      exchangeBody: { scope: 'offline_access api://bridge/scope' }
    })

    const saved = setSession.mock.calls[0][1]
    expect(saved.tokenSet.access_token).toBe('cds-token')
    expect(saved.tokenSet.refresh_token).toBe('r2')
    expect(saved.resourceTokens.bridge.access_token).toBe('bridge-new')
  })

  it('refreshes an expired cached bridge token', async () => {
    getSession.mockResolvedValue({
      tokenSet: { refresh_token: 'r1' },
      resourceTokens: {
        bridge: { access_token: 'old', expires_at: anHourAgo() }
      }
    })
    refresh.mockResolvedValue({
      access_token: 'bridge-new',
      expires_at: inOneHour()
    })

    expect(await getAccessToken('sid', 'bridge')).toBe('bridge-new')
    // keeps the old refresh token when Entra does not rotate it
    expect(setSession.mock.calls[0][1].tokenSet.refresh_token).toBe('r1')
  })

  it('throws for an unknown resource', async () => {
    getSession.mockResolvedValue({ tokenSet: { access_token: 'x' } })
    await expect(getAccessToken('sid', 'nope')).rejects.toThrow(
      'Unknown API resource: nope'
    )
  })
})
