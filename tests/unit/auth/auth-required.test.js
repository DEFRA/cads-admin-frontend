import { describe, it, expect, vi } from 'vitest'

// Import module under test AFTER mocks
import { authRequired } from '../../../src/auth/auth-required.js'

function createH() {
  return {
    redirect: vi.fn(() => ({
      takeover: vi.fn(() => 'takeover')
    })),
    continue: 'continue'
  }
}

describe('authRequired', () => {
  it('redirects unauthenticated users to /login with the original path', () => {
    const request = {
      auth: { credentials: null },
      path: '/protected/route',
      app: {}
    }

    const h = createH()

    const result = authRequired(request, h)

    expect(request.app.redirectTo).toBe('/protected/route')
    expect(h.redirect).toHaveBeenCalledWith(
      '/login?redirect=%2Fprotected%2Froute'
    )
    expect(result).toBe('takeover')
  })

  it('allows authenticated users to continue', () => {
    const request = {
      auth: { credentials: { user: { id: '12345' } } },
      app: {}
    }

    const h = createH()

    const result = authRequired(request, h)

    expect(result).toBe('continue')
  })
})
